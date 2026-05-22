import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership, getValidGroupMemberIds } from "@/lib/repositories/groupRepository";
import { getExpenseByIdAndGroupId, updateExpense, getExpenseById, deleteExpense } from "@/lib/repositories/expenseRepository";
import { computeSplits, type SplitType, type SplitInput } from "@/lib/splits";
import { CURRENCIES } from "@/lib/currencies";

interface RouteParams {
  params: Promise<{ id: string; expenseId: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId, expenseId } = await params;

  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = getExpenseByIdAndGroupId(expenseId, groupId);

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (existing.paid_by !== session.user.id) {
    return NextResponse.json({ error: "Only the expense payer can edit it" }, { status: 403 });
  }

  let body: { title?: string; amount?: number; currency?: string; paidBy?: string; splitType?: string; splitWith?: { userId: string; shares: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, amount, currency, paidBy, splitType = "equal", splitWith } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!amount || typeof amount !== "number" || amount <= 0) {
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
  if (!splitWith || !splitWith.length) {
    return NextResponse.json({ error: "splitWith is required" }, { status: 400 });
  }
  for (const { shares } of splitWith) {
    if (typeof shares !== "number" || shares < 1) {
      return NextResponse.json({ error: "Each share value must be a positive integer" }, { status: 400 });
    }
  }

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
  const sharesMap = new Map(splitWith.map((s) => [s.userId, s.shares]));

  updateExpense(
    expenseId,
    {
      title: title.trim(),
      amount,
      currency,
      paid_by: paidBy,
      split_type: splitType,
    },
    computedSplits.map((s) => ({
      user_id: s.userId,
      amount: s.amount,
      shares: sharesMap.get(s.userId) ?? 1,
    }))
  );

  const updated = getExpenseById(expenseId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId, expenseId } = await params;

  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = getExpenseByIdAndGroupId(expenseId, groupId);

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (existing.paid_by !== session.user.id) {
    return NextResponse.json({ error: "Only the expense payer can delete it" }, { status: 403 });
  }

  deleteExpense(expenseId);

  return NextResponse.json({ success: true });
}
