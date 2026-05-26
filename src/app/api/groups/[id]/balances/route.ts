import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership, getGroupMembers, getSponsorsForGroup } from "@/lib/repositories/groupRepository";
import { getExpensesByGroupId, getExpenseSplitsByGroupId } from "@/lib/repositories/expenseRepository";
import { getSettlementsByGroupId } from "@/lib/repositories/settlementRepository";
import { calculateBalances } from "@/lib/balance";

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

  // Fetch members
  const members = getGroupMembers(groupId);

  // Fetch expenses with splits
  const rawExpenses = getExpensesByGroupId(groupId);
  const rawSplits = getExpenseSplitsByGroupId(groupId);

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
    currency: e.currency,
    splits: splitsByExpense[e.id] ?? [],
  }));

  // Fetch settlements
  const rawSettlements = getSettlementsByGroupId(groupId);

  const settlements = rawSettlements.map((s) => ({
    fromUser: s.from_user,
    toUser: s.to_user,
    amount: s.amount,
    currency: s.currency,
  }));

  // Build sponsor map
  const sponsors = getSponsorsForGroup(groupId);
  const sponsorMap = new Map<string, string>();
  for (const s of sponsors) {
    sponsorMap.set(s.user_id, s.sponsored_by);
  }

  const balances = calculateBalances(members, expenses, settlements, sponsorMap.size > 0 ? sponsorMap : undefined);

  return NextResponse.json(balances);
}
