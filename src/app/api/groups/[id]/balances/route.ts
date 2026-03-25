import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { calculateBalances } from "@/lib/balance";

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

  // Fetch members
  const members = db
    .prepare(
      `
      SELECT u.id, u.name, u.email
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `
    )
    .all(groupId) as Array<{ id: string; name: string | null; email: string }>;

  // Fetch expenses with splits
  const rawExpenses = db
    .prepare(
      "SELECT id, paid_by, amount FROM expenses WHERE group_id = ?"
    )
    .all(groupId) as Array<{ id: string; paid_by: string; amount: number }>;

  const rawSplits = db
    .prepare(
      `
      SELECT es.expense_id, es.user_id, es.amount
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ?
    `
    )
    .all(groupId) as Array<{ expense_id: string; user_id: string; amount: number }>;

  const splitsByExpense: Record<string, Array<{ userId: string; amount: number }>> = {};
  for (const split of rawSplits) {
    if (!splitsByExpense[split.expense_id]) {
      splitsByExpense[split.expense_id] = [];
    }
    splitsByExpense[split.expense_id].push({ userId: split.user_id, amount: split.amount });
  }

  const expenses = rawExpenses.map((e) => ({
    id: e.id,
    paidBy: e.paid_by,
    amount: e.amount,
    splits: splitsByExpense[e.id] ?? [],
  }));

  // Fetch settlements
  const rawSettlements = db
    .prepare(
      "SELECT from_user, to_user, amount FROM settlements WHERE group_id = ?"
    )
    .all(groupId) as Array<{ from_user: string; to_user: string; amount: number }>;

  const settlements = rawSettlements.map((s) => ({
    fromUser: s.from_user,
    toUser: s.to_user,
    amount: s.amount,
  }));

  const balances = calculateBalances(members, expenses, settlements);

  return NextResponse.json(balances);
}
