import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import getDb from "@/lib/db";
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

  const db = getDb();
  const groups = db
    .prepare(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.invite_code,
        g.created_by,
        g.created_at,
        COUNT(DISTINCT gm2.id) as member_count,
        (SELECT COUNT(*) FROM expenses e WHERE e.group_id = g.id) as expense_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `
    )
    .all(session.user.id) as GroupRow[];

  const currentUserId = session.user.id;

  // Fetch all expenses in the user's groups
  const expenses = db
    .prepare(
      `
      SELECT id, group_id, paid_by, amount, currency
      FROM expenses
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
    `
    )
    .all(currentUserId) as Array<{
      id: string;
      group_id: string;
      paid_by: string;
      amount: number;
      currency: string;
    }>;

  // Fetch all splits for those expenses
  const splits = db
    .prepare(
      `
      SELECT es.user_id, es.amount, e.group_id, e.currency
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
    `
    )
    .all(currentUserId) as Array<{
      user_id: string;
      amount: number;
      group_id: string;
      currency: string;
    }>;

  // Fetch all settlements in those groups
  const settlements = db
    .prepare(
      `
      SELECT group_id, from_user, to_user, amount, currency
      FROM settlements
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
    `
    )
    .all(currentUserId) as Array<{
      group_id: string;
      from_user: string;
      to_user: string;
      amount: number;
      currency: string;
    }>;

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

