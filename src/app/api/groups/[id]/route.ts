import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id } = await params;

  // Verify membership
  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(id, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = db
    .prepare(
      "SELECT id, name, description, invite_code, view_code, created_by, created_at FROM groups WHERE id = ?"
    )
    .get(id);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const groupRow = group as { id: string; name: string; description: string | null; invite_code: string; view_code: string | null; created_by: string; created_at: number };
  const isCreator = groupRow.created_by === session.user.id;

  const rawMembers = db
    .prepare(
      `
      SELECT u.id, u.name, u.email, u.image, u.iban, u.is_placeholder, u.claim_code, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at ASC
    `
    )
    .all(id) as Array<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      iban: string | null;
      is_placeholder: number;
      claim_code: string | null;
      joined_at: number;
    }>;

  const members = rawMembers.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    image: m.image,
    iban: m.iban,
    joined_at: m.joined_at,
    is_placeholder: m.is_placeholder === 1,
    claim_code: isCreator ? m.claim_code : null,
  }));

  return NextResponse.json({
    ...groupRow,
    view_code: isCreator ? groupRow.view_code : null,
    members,
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id } = await params;

  const group = db
    .prepare("SELECT id, created_by FROM groups WHERE id = ?")
    .get(id) as { id: string; created_by: string } | undefined;

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.created_by !== session.user.id) {
    return NextResponse.json({ error: "Only the creator can delete this group" }, { status: 403 });
  }

  db.prepare("DELETE FROM groups WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
