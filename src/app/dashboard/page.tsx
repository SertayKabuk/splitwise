import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserGroups } from "@/lib/repositories/groupRepository";
import { calculateGroupBalances } from "@/lib/balance";
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

  const extendedGroups = groups.map((g) => {
    // If a group has no expenses, it is considered open (per user rules preference)
    if (g.expense_count === 0) {
      return { ...g, isSettled: false };
    }

    const balances = calculateGroupBalances(g.id);
    const isSettled = balances.length === 0;

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

