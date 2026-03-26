import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID, randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count,
        (SELECT COUNT(*) FROM expenses e WHERE e.group_id = g.id) as expense_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      ORDER BY g.created_at DESC
    `
    )
    .all(session.user.id);

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, description } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const db = getDb();
  const groupId = randomUUID();
  const inviteCode = randomBytes(4).toString("hex");

  const insertGroup = db.prepare(
    "INSERT INTO groups (id, name, description, invite_code, created_by) VALUES (?, ?, ?, ?, ?)"
  );
  const insertMember = db.prepare(
    "INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)"
  );

  db.transaction(() => {
    insertGroup.run(groupId, name.trim(), description?.trim() ?? null, inviteCode, session.user.id);
    insertMember.run(randomUUID(), groupId, session.user.id);
  })();

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);
  return NextResponse.json(group, { status: 201 });
}
