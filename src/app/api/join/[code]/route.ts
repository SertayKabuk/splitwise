import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const db = getDb();
  const { code } = await params;

  const group = db
    .prepare(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        COUNT(gm.id) as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.invite_code = ?
      GROUP BY g.id
    `
    )
    .get(code) as
    | { id: string; name: string; description: string | null; member_count: number }
    | undefined;

  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  return NextResponse.json(group);
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { code } = await params;

  const group = db
    .prepare("SELECT id FROM groups WHERE invite_code = ?")
    .get(code) as { id: string } | undefined;

  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Check if already a member
  const existing = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(group.id, session.user.id);

  if (existing) {
    return NextResponse.json({ groupId: group.id, alreadyMember: true });
  }

  db.prepare(
    "INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)"
  ).run(randomUUID(), group.id, session.user.id);

  return NextResponse.json({ groupId: group.id, alreadyMember: false });
}
