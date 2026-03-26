import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
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

  const db = getDb();
  const { id: groupId, expenseId } = await params;

  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = db
    .prepare("SELECT id, paid_by FROM expenses WHERE id = ? AND group_id = ?")
    .get(expenseId, groupId) as { id: string; paid_by: string } | undefined;

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
  const placeholders = allUserIds.map(() => "?").join(",");
  const validMembers = db
    .prepare(`SELECT user_id FROM group_members WHERE group_id = ? AND user_id IN (${placeholders})`)
    .all(groupId, ...allUserIds) as Array<{ user_id: string }>;
  const validIds = new Set(validMembers.map((m) => m.user_id));

  if (!validIds.has(paidBy)) {
    return NextResponse.json({ error: "Payer is not a group member" }, { status: 400 });
  }
  const invalidSplit = splitWith.find((s) => !validIds.has(s.userId));
  if (invalidSplit) {
    return NextResponse.json({ error: `User ${invalidSplit.userId} is not a group member` }, { status: 400 });
  }

  const computedSplits = computeSplits(amount, splitWith as SplitInput[], splitType as SplitType);
  const sharesMap = new Map(splitWith.map((s) => [s.userId, s.shares]));

  db.transaction(() => {
    db.prepare("UPDATE expenses SET title = ?, amount = ?, currency = ?, paid_by = ?, split_type = ? WHERE id = ?").run(
      title.trim(),
      amount,
      currency,
      paidBy,
      splitType,
      expenseId
    );
    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(expenseId);
    const insertSplit = db.prepare(
      "INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)"
    );
    for (const { userId, amount: splitAmt } of computedSplits) {
      insertSplit.run(randomUUID(), expenseId, userId, splitAmt, sharesMap.get(userId) ?? 1);
    }
  })();

  const updated = db.prepare("SELECT * FROM expenses WHERE id = ?").get(expenseId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id: groupId, expenseId } = await params;

  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = db
    .prepare("SELECT id, paid_by FROM expenses WHERE id = ? AND group_id = ?")
    .get(expenseId, groupId) as { id: string; paid_by: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (existing.paid_by !== session.user.id) {
    return NextResponse.json({ error: "Only the expense payer can delete it" }, { status: 403 });
  }

  db.transaction(() => {
    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(expenseId);
    db.prepare("DELETE FROM expenses WHERE id = ?").run(expenseId);
  })();

  return NextResponse.json({ success: true });
}
