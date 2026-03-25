import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import getDb from "@/lib/db";
import Link from "next/link";
import CreateGroupForm from "./CreateGroupForm";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: number;
  member_count: number;
  total_expenses: number;
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
        COALESCE(SUM(e.amount), 0) as total_expenses
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id
      LEFT JOIN expenses e ON g.id = e.group_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `
    )
    .all(session.user.id) as GroupRow[];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Groups</h1>
          <p className="text-slate-500 mt-1">Manage your travel group expenses</p>
        </div>
        <CreateGroupForm />
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No groups yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            Create one or join via invite link to start splitting expenses with your travel companions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 text-lg leading-tight">
                    {group.name}
                  </h2>
                  {group.description && (
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center ml-3">
                  <span className="text-indigo-600 font-bold text-sm">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{group.member_count} member{group.member_count !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>${group.total_expenses.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href={`/groups/${group.id}`}
                className="mt-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                View Group
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
