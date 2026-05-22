import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserGroups } from "@/lib/repositories/groupRepository";
import { getExpensesByUserGroups, getExpenseSplitsByUserGroups } from "@/lib/repositories/expenseRepository";
import { getSettlementsByUserGroups } from "@/lib/repositories/settlementRepository";
import CreateGroupForm from "./CreateGroupForm";
import DashboardClient from "./DashboardClient";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: number;
  member_count: number;
  expense_count: number;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const currentUserId = session.user.id;
  const groups = getUserGroups(currentUserId) as GroupRow[];

  // Fetch all expenses in the user's groups
  const expenses = getExpensesByUserGroups(currentUserId);

  // Fetch all splits for those expenses
  const splits = getExpenseSplitsByUserGroups(currentUserId);

  // Fetch all settlements in those groups
  const settlements = getSettlementsByUserGroups(currentUserId);

  // Compute the net balance of each user per group and currency
  const balancesByGroup: Record<string, Record<string, Record<string, number>>> = {};

  const adjustBalance = (groupId: string, currency: string, userId: string, change: number) => {
    if (!balancesByGroup[groupId]) {
      balancesByGroup[groupId] = {};
    }
    if (!balancesByGroup[groupId][currency]) {
      balancesByGroup[groupId][currency] = {};
    }
    if (balancesByGroup[groupId][currency][userId] === undefined) {
      balancesByGroup[groupId][currency][userId] = 0;
    }
    balancesByGroup[groupId][currency][userId] += change;
  };

  for (const exp of expenses) {
    adjustBalance(exp.group_id, exp.currency, exp.paid_by, exp.amount);
  }

  for (const split of splits) {
    adjustBalance(split.group_id, split.currency, split.user_id, -split.amount);
  }

  for (const set of settlements) {
    adjustBalance(set.group_id, set.currency, set.from_user, set.amount);
    adjustBalance(set.group_id, set.currency, set.to_user, -set.amount);
  }

  const extendedGroups = groups.map((g) => {
    // If a group has no expenses, it is considered open (per user rules preference)
    if (g.expense_count === 0) {
      return { ...g, isSettled: false };
    }

    const groupBalances = balancesByGroup[g.id];
    if (!groupBalances) {
      return { ...g, isSettled: false };
    }

    let isSettled = true;
    for (const currency of Object.keys(groupBalances)) {
      const userBalances = groupBalances[currency];
      for (const userId of Object.keys(userBalances)) {
        if (Math.abs(userBalances[userId]) > 0.005) {
          isSettled = false;
          break;
        }
      }
      if (!isSettled) break;
    }

    return { ...g, isSettled };
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Groups</h1>
          <p className="text-muted-foreground mt-1">Manage your travel group expenses</p>
        </div>
        <CreateGroupForm />
      </div>

      <DashboardClient initialGroups={extendedGroups} currentUserId={currentUserId} />
    </main>
  );
}

