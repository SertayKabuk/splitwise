import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ id: string; expenseId: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
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
    .prepare("SELECT id FROM expenses WHERE id = ? AND group_id = ?")
    .get(expenseId, groupId);

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
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

  const payerMembership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, paidBy);
  if (!payerMembership) {
    return NextResponse.json({ error: "Payer is not a group member" }, { status: 400 });
  }

  let splitUserIds: string[] = splitWith ?? [];
  if (!splitUserIds.length) {
    const allMembers = db
      .prepare("SELECT user_id FROM group_members WHERE group_id = ?")
      .all(groupId) as Array<{ user_id: string }>;
    splitUserIds = allMembers.map((m) => m.user_id);
  }

  for (const userId of splitUserIds) {
    const m = db
      .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
      .get(groupId, userId);
    if (!m) {
      return NextResponse.json({ error: `User ${userId} is not a group member` }, { status: 400 });
    }
  }

  const splitAmount = Math.round((amount / splitUserIds.length) * 100) / 100;

  db.transaction(() => {
    db.prepare("UPDATE expenses SET title = ?, amount = ?, paid_by = ? WHERE id = ?").run(
      title.trim(),
      amount,
      paidBy,
      expenseId
    );
    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(expenseId);
    const insertSplit = db.prepare(
      "INSERT INTO expense_splits (id, expense_id, user_id, amount) VALUES (?, ?, ?, ?)"
    );
    for (const userId of splitUserIds) {
      insertSplit.run(randomUUID(), expenseId, userId, splitAmount);
    }
  })();

  const updated = db.prepare("SELECT * FROM expenses WHERE id = ?").get(expenseId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
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
    .prepare("SELECT id FROM expenses WHERE id = ? AND group_id = ?")
    .get(expenseId, groupId);

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  db.transaction(() => {
    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(expenseId);
    db.prepare("DELETE FROM expenses WHERE id = ?").run(expenseId);
  })();

  return NextResponse.json({ success: true });
}
