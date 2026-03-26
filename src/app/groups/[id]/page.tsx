import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import getDb from "@/lib/db";
import { calculateBalances } from "@/lib/balance";
import GroupPageClient from "./GroupPageClient";
import type { Settlement } from "./types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupPage({ params }: PageProps) {
  const session = await auth();
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
      `SELECT u.id, u.name, u.email, u.image, u.iban, gm.joined_at
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
      iban: string | null;
      joined_at: number;
    }>;

  // Fetch expenses with payer info and splits
  const rawExpenses = db
    .prepare(
      `SELECT e.id, e.title, e.amount, e.currency, e.paid_by, e.split_type, e.created_at,
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
      currency: string;
      paid_by: string;
      split_type: string;
      created_at: number;
      payer_name: string | null;
      payer_email: string;
    }>;

  const rawSplits = db
    .prepare(
      `SELECT es.expense_id, es.user_id, es.amount, es.shares, u.name, u.email
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = ?`
    )
    .all(groupId) as Array<{
      expense_id: string;
      user_id: string;
      amount: number;
      shares: number;
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
    .prepare(
      `SELECT s.id, s.from_user, s.to_user, s.amount, s.currency, s.settled_at,
              fu.name as from_name, fu.email as from_email,
              tu.name as to_name, tu.email as to_email
       FROM settlements s
       JOIN users fu ON s.from_user = fu.id
       JOIN users tu ON s.to_user = tu.id
       WHERE s.group_id = ?
       ORDER BY s.settled_at DESC`
    )
    .all(groupId) as Array<{
      id: string;
      from_user: string;
      to_user: string;
      amount: number;
      currency: string;
      settled_at: number;
      from_name: string | null;
      from_email: string;
      to_name: string | null;
      to_email: string;
    }>;

  const settlements: Settlement[] = rawSettlements.map((s) => ({
    id: s.id,
    fromUserId: s.from_user,
    fromUserName: s.from_name ?? s.from_email,
    toUserId: s.to_user,
    toUserName: s.to_name ?? s.to_email,
    amount: s.amount,
    currency: s.currency,
    settledAt: s.settled_at,
  }));

  // Calculate balances
  const balances = calculateBalances(
    members,
    expenses.map((e) => ({
      id: e.id,
      paidBy: e.paid_by,
      amount: e.amount,
      currency: e.currency,
      splits: (splitsByExpense[e.id] ?? []).map((s) => ({ userId: s.user_id, amount: s.amount })),
    })),
    rawSettlements.map((s) => ({ fromUser: s.from_user, toUser: s.to_user, amount: s.amount, currency: s.currency }))
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
