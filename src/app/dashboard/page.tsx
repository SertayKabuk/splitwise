import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import getDb from "@/lib/db";
import Link from "next/link";
import CreateGroupForm from "./CreateGroupForm";
import DeleteGroupButton from "./DeleteGroupButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, ArrowRight } from "lucide-react";

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

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No groups yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Create one or join via invite link to start splitting expenses with your travel companions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col gap-4 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-foreground text-lg leading-tight">
                    {group.name}
                  </h2>
                  {group.description && (
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  {group.created_by === currentUserId && (
                    <DeleteGroupButton groupId={group.id} />
                  )}
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{group.member_count} member{group.member_count !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ClipboardList className="w-4 h-4" />
                  <span>{group.expense_count} expense{group.expense_count !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <Button asChild className="mt-auto gap-2">
                <Link href={`/groups/${group.id}`}>
                  View Group
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
