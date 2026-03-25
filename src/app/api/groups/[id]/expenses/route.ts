import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

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

  let body: { title?: string; amount?: number; paidBy?: string; splitWith?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, amount, paidBy, splitWith } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  if (!paidBy || typeof paidBy !== "string") {
    return NextResponse.json({ error: "paidBy is required" }, { status: 400 });
  }

  // Validate payer is a group member
  const payerMembership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, paidBy);

  if (!payerMembership) {
    return NextResponse.json({ error: "Payer is not a group member" }, { status: 400 });
  }

  // Determine who to split with
  let splitUserIds: string[] = splitWith ?? [];

  if (!splitUserIds.length) {
    // Default to all group members
    const allMembers = db
      .prepare("SELECT user_id FROM group_members WHERE group_id = ?")
      .all(groupId) as Array<{ user_id: string }>;
    splitUserIds = allMembers.map((m) => m.user_id);
  }

  // Validate all split users are group members
  for (const userId of splitUserIds) {
    const m = db
      .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
      .get(groupId, userId);
    if (!m) {
      return NextResponse.json(
        { error: `User ${userId} is not a group member` },
        { status: 400 }
      );
    }
  }

  const splitAmount = Math.round((amount / splitUserIds.length) * 100) / 100;
  const expenseId = randomUUID();

  const insertExpense = db.prepare(
    "INSERT INTO expenses (id, group_id, title, amount, paid_by) VALUES (?, ?, ?, ?, ?)"
  );
  const insertSplit = db.prepare(
    "INSERT INTO expense_splits (id, expense_id, user_id, amount) VALUES (?, ?, ?, ?)"
  );

  db.transaction(() => {
    insertExpense.run(expenseId, groupId, title.trim(), amount, paidBy);
    for (const userId of splitUserIds) {
      insertSplit.run(randomUUID(), expenseId, userId, splitAmount);
    }
  })();

  const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(expenseId);
  return NextResponse.json(expense, { status: 201 });
}
