import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import getDb from "@/lib/db";
import JoinGroupClient from "./JoinGroupClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const db = getDb();
  const { code } = await params;

  // Fetch group info
  const group = db
    .prepare(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.invite_code,
        COUNT(gm.id) as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.invite_code = ?
      GROUP BY g.id
    `
    )
    .get(code) as
    | {
        id: string;
        name: string;
        description: string | null;
        invite_code: string;
        member_count: number;
      }
    | undefined;

  if (!group) {
    notFound();
  }

  // If authenticated, check if already a member
  if (session?.user?.id) {
    const membership = db
      .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
      .get(group.id, session.user.id);

    if (membership) {
      redirect(`/groups/${group.id}`);
    }
  }

  // Fetch current members for display
  const members = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.image
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC`
    )
    .all(group.id) as Array<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }>;

  return (
    <JoinGroupClient
      group={group}
      members={members}
      inviteCode={code}
      isAuthenticated={!!session?.user?.id}
    />
  );
}
