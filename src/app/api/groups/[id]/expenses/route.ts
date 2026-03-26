import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { computeSplits, type SplitType, type SplitInput } from "@/lib/splits";
import { CURRENCIES } from "@/lib/currencies";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id: groupId } = await params;

  // Verify membership
  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.amount,
        e.currency,
        e.paid_by,
        e.created_at,
        u.name as payer_name,
        u.email as payer_email
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = ?
      ORDER BY e.created_at DESC
    `
    )
    .all(groupId) as Array<{
      id: string;
      title: string;
      amount: number;
      currency: string;
      paid_by: string;
      created_at: number;
      payer_name: string | null;
      payer_email: string;
    }>;

  const splits = db
    .prepare(
      `
      SELECT
        es.expense_id,
        es.user_id,
        es.amount,
        u.name,
        u.email
      FROM expense_splits es
      JOIN users u ON es.user_id = u.id
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ?
    `
    )
    .all(groupId) as Array<{
      expense_id: string;
      user_id: string;
      amount: number;
      name: string | null;
      email: string;
    }>;

  const splitsByExpense: Record<string, typeof splits> = {};
  for (const split of splits) {
    if (!splitsByExpense[split.expense_id]) {
      splitsByExpense[split.expense_id] = [];
    }
    splitsByExpense[split.expense_id].push(split);
  }

  const result = expenses.map((e) => ({
    ...e,
    splits: splitsByExpense[e.id] ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id: groupId } = await params;

  // Verify membership
  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // Validate payer and all split users are group members in two queries
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
  const expenseId = randomUUID();

  const insertExpense = db.prepare(
    "INSERT INTO expenses (id, group_id, title, amount, currency, paid_by) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertSplit = db.prepare(
    "INSERT INTO expense_splits (id, expense_id, user_id, amount) VALUES (?, ?, ?, ?)"
  );

  db.transaction(() => {
    insertExpense.run(expenseId, groupId, title.trim(), amount, currency, paidBy);
    for (const { userId, amount: splitAmt } of computedSplits) {
      insertSplit.run(randomUUID(), expenseId, userId, splitAmt);
    }
  })();

  const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(expenseId);
  return NextResponse.json(expense, { status: 201 });
}
