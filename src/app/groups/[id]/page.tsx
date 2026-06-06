import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getGroupMembership, getGroupById, getGroupMembers } from "@/lib/repositories/groupRepository";
import { getExpensesByGroupId, getExpenseSplitsByGroupId, getAttachmentsByGroupId } from "@/lib/repositories/expenseRepository";
import { getSettlementsByGroupId } from "@/lib/repositories/settlementRepository";
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

  const { id: groupId } = await params;

  // Check membership
  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    notFound();
  }

  // Fetch group
  const group = getGroupById(groupId);

  if (!group) {
    notFound();
  }

  // Fetch members
  const rawMembers = getGroupMembers(groupId);

  const isCreator = group.created_by === session.user.id;
  const members = rawMembers.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    image: m.image,
    iban: m.iban,
    joined_at: m.joined_at,
    is_placeholder: m.is_placeholder,
    claim_code: isCreator ? m.claim_code : null,
    sponsored_by: m.sponsored_by,
  }));

  // Fetch expenses with payer info and splits
  const rawExpenses = getExpensesByGroupId(groupId);

  const rawSplits = getExpenseSplitsByGroupId(groupId);
  const rawAttachments = getAttachmentsByGroupId(groupId);

  const splitsByExpense: Record<string, typeof rawSplits> = {};
  for (const split of rawSplits) {
    if (!splitsByExpense[split.expense_id]) splitsByExpense[split.expense_id] = [];
    splitsByExpense[split.expense_id].push(split);
  }

  const attachmentsByExpense: Record<string, typeof rawAttachments> = {};
  for (const att of rawAttachments) {
    if (!attachmentsByExpense[att.expense_id]) attachmentsByExpense[att.expense_id] = [];
    attachmentsByExpense[att.expense_id].push(att);
  }

  const expenses = rawExpenses.map((e) => ({
    ...e,
    splits: splitsByExpense[e.id] ?? [],
    attachments: attachmentsByExpense[e.id] ?? [],
  }));

  // Fetch settlements
  const rawSettlements = getSettlementsByGroupId(groupId);

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

  // Build sponsor map from member data
  const sponsorMap = new Map<string, string>();
  for (const m of rawMembers) {
    if (m.sponsored_by) {
      sponsorMap.set(m.id, m.sponsored_by);
    }
  }

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
    rawSettlements.map((s) => ({ fromUser: s.from_user, toUser: s.to_user, amount: s.amount, currency: s.currency })),
    sponsorMap.size > 0 ? sponsorMap : undefined
  );

  const groupForClient = {
    ...group,
    view_code: isCreator ? group.view_code : null,
  };

  return (
    <GroupPageClient
      group={groupForClient}
      members={members}
      expenses={expenses}
      balances={balances}
      settlements={settlements}
      currentUserId={session.user.id}
    />
  );
}
