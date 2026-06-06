import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership, getValidGroupMemberIds } from "@/lib/repositories/groupRepository";
import {
  getExpensesByGroupId,
  getExpenseSplitsByGroupId,
  createExpense,
  getExpenseById,
  getAttachmentsByGroupId,
  getAttachmentsByExpenseId,
} from "@/lib/repositories/expenseRepository";
import { randomUUID } from "crypto";
import { computeSplits, type SplitType, type SplitInput } from "@/lib/splits";
import { CURRENCIES } from "@/lib/currencies";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Verify membership
  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = getExpensesByGroupId(groupId);
  const splits = getExpenseSplitsByGroupId(groupId);
  const attachments = getAttachmentsByGroupId(groupId);

  const splitsByExpense: Record<string, typeof splits> = {};
  for (const split of splits) {
    if (!splitsByExpense[split.expense_id]) {
      splitsByExpense[split.expense_id] = [];
    }
    splitsByExpense[split.expense_id].push(split);
  }

  const attachmentsByExpense: Record<string, typeof attachments> = {};
  for (const att of attachments) {
    if (!attachmentsByExpense[att.expense_id]) {
      attachmentsByExpense[att.expense_id] = [];
    }
    attachmentsByExpense[att.expense_id].push(att);
  }

  const result = expenses.map((e) => ({
    ...e,
    splits: splitsByExpense[e.id] ?? [],
    attachments: attachmentsByExpense[e.id] ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Verify membership
  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const title = formData.get("title") as string;
  const amountStr = formData.get("amount") as string;
  const currency = formData.get("currency") as string;
  const paidBy = formData.get("paidBy") as string;
  const splitType = (formData.get("splitType") as string) || "equal";
  const splitWithStr = formData.get("splitWith") as string;
  const notes = (formData.get("notes") as string) || null;
  const files = formData.getAll("files") as File[];

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  if (!currency || !(currency in CURRENCIES)) {
    return NextResponse.json({ error: "A valid currency is required" }, { status: 400 });
  }
  if (!paidBy || typeof paidBy !== "string") {
    return NextResponse.json({ error: "paidBy is required" }, { status: 400 });
  }
  if (splitType !== "equal" && splitType !== "shares") {
    return NextResponse.json({ error: "splitType must be 'equal' or 'shares'" }, { status: 400 });
  }

  let splitWith: { userId: string; shares: number }[];
  try {
    splitWith = splitWithStr ? JSON.parse(splitWithStr) : [];
  } catch {
    return NextResponse.json({ error: "splitWith must be a valid JSON array" }, { status: 400 });
  }

  if (!splitWith || !splitWith.length) {
    return NextResponse.json({ error: "splitWith is required" }, { status: 400 });
  }
  for (const { shares } of splitWith) {
    if (typeof shares !== "number" || shares < 1) {
      return NextResponse.json({ error: "Each share value must be a positive integer" }, { status: 400 });
    }
  }

  // Validate payer and all split users are group members
  const allUserIds = Array.from(new Set([paidBy, ...splitWith.map((s) => s.userId)]));
  const validMembers = getValidGroupMemberIds(groupId, allUserIds);
  const validIds = new Set(validMembers);

  if (!validIds.has(paidBy)) {
    return NextResponse.json({ error: "Payer is not a group member" }, { status: 400 });
  }
  const invalidSplit = splitWith.find((s) => !validIds.has(s.userId));
  if (invalidSplit) {
    return NextResponse.json({ error: `User ${invalidSplit.userId} is not a group member` }, { status: 400 });
  }

  const computedSplits = computeSplits(amount, splitWith as SplitInput[], splitType as SplitType);
  const expenseId = randomUUID();
  const sharesMap = new Map(splitWith.map((s) => [s.userId, s.shares]));

  // Save files to filesystem
  const attachmentsToCreate: Array<{ id: string; file_path: string; original_name: string; mime_type: string; size: number }> = [];
  const filesWritten: string[] = [];

  try {
    const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "attachments");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const file of files) {
      if (!file || !file.name || file.size === 0) continue;

      const fileId = randomUUID();
      const relativePath = path.join("data", "attachments", fileId);
      const absolutePath = path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(absolutePath, buffer);
      filesWritten.push(absolutePath);

      attachmentsToCreate.push({
        id: fileId,
        file_path: relativePath,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
      });
    }
  } catch (fileErr) {
    for (const p of filesWritten) {
      try { fs.unlinkSync(p); } catch {}
    }
    return NextResponse.json({ error: "Failed to save file attachments" }, { status: 500 });
  }

  try {
    createExpense(
      {
        id: expenseId,
        group_id: groupId,
        title: title.trim(),
        amount,
        currency,
        paid_by: paidBy,
        split_type: splitType,
        notes,
      },
      computedSplits.map((s) => ({
        user_id: s.userId,
        amount: s.amount,
        shares: sharesMap.get(s.userId) ?? 1,
      })),
      attachmentsToCreate
    );
  } catch (dbErr) {
    for (const p of filesWritten) {
      try { fs.unlinkSync(p); } catch {}
    }
    return NextResponse.json({ error: "Failed to save expense to database" }, { status: 500 });
  }

  const expense = getExpenseById(expenseId);
  const expenseSplits = getExpenseSplitsByGroupId(groupId).filter((s) => s.expense_id === expenseId);
  const expenseAttachments = getAttachmentsByExpenseId(expenseId);

  const result = {
    ...expense,
    splits: expenseSplits,
    attachments: expenseAttachments,
  };

  return NextResponse.json(result, { status: 201 });
}

