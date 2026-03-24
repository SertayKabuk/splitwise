import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import getDb from "@/lib/db";
import { calculateBalances } from "@/lib/balance";
import GroupPageClient from "./GroupPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }

  const db = getDb();
  const { id: groupId } = await params;

  // Check membership
  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, session.user.id);

  if (!membership) {
    notFound();
  }

  // Fetch group
  const group = db
    .prepare("SELECT id, name, description, invite_code, created_by, created_at FROM groups WHERE id = ?")
    .get(groupId) as {
      id: string;
      name: string;
      description: string | null;
      invite_code: string;
      created_by: string;
      created_at: number;
    } | undefined;

  if (!group) {
    notFound();
  }

  // Fetch members
  const members = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.image, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC`
    )
    .all(groupId) as Array<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      joined_at: number;
    }>;

  // Fetch expenses with payer info and splits
  const rawExpenses = db
    .prepare(
      `SELECT e.id, e.title, e.amount, e.paid_by, e.created_at,
              u.name as payer_name, u.email as payer_email
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.group_id = ?
       ORDER BY e.created_at DESC`
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

  const rawSplits = db
    .prepare(
      `SELECT es.expense_id, es.user_id, es.amount, u.name, u.email
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = ?`
    )
    .all(groupId) as Array<{
      expense_id: string;
      user_id: string;
      amount: number;
      name: string | null;
      email: string;
    }>;

  const splitsByExpense: Record<string, typeof rawSplits> = {};
  for (const split of rawSplits) {
    if (!splitsByExpense[split.expense_id]) splitsByExpense[split.expense_id] = [];
    splitsByExpense[split.expense_id].push(split);
  }

  const expenses = rawExpenses.map((e) => ({
    ...e,
    splits: splitsByExpense[e.id] ?? [],
  }));

  // Fetch settlements
  const rawSettlements = db
    .prepare("SELECT from_user, to_user, amount, settled_at FROM settlements WHERE group_id = ?")
    .all(groupId) as Array<{ from_user: string; to_user: string; amount: number; settled_at: number }>;

  const settlements = rawSettlements.map((s) => ({
    fromUser: s.from_user,
    toUser: s.to_user,
    amount: s.amount,
    settledAt: s.settled_at,
  }));

  // Calculate balances
  const balances = calculateBalances(
    members,
    expenses.map((e) => ({
      id: e.id,
      paidBy: e.paid_by,
      amount: e.amount,
      splits: (splitsByExpense[e.id] ?? []).map((s) => ({ userId: s.user_id, amount: s.amount })),
    })),
    rawSettlements.map((s) => ({ fromUser: s.from_user, toUser: s.to_user, amount: s.amount }))
  );

  return (
    <GroupPageClient
      group={group}
      members={members}
      expenses={expenses}
      balances={balances}
      settlements={settlements}
      currentUserId={session.user.id}
    />
  );
}
