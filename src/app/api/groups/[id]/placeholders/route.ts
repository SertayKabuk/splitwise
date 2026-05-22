import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID, randomBytes } from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id: groupId } = await params;

  const group = db
    .prepare("SELECT id, created_by FROM groups WHERE id = ?")
    .get(groupId) as { id: string; created_by: string } | undefined;

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (group.created_by !== session.user.id) {
    return NextResponse.json({ error: "Only the group creator can add placeholders" }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const userId = randomUUID();
  const claimCode = randomBytes(16).toString("hex");
  const syntheticEmail = `placeholder:${userId}@local`;

  db.transaction(() => {
    db.prepare(
      "INSERT INTO users (id, email, name, image, is_placeholder, claim_code) VALUES (?, ?, ?, NULL, 1, ?)"
    ).run(userId, syntheticEmail, name, claimCode);

    db.prepare(
      "INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)"
    ).run(randomUUID(), groupId, userId);
  })();

  const joined = db
    .prepare("SELECT joined_at FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, userId) as { joined_at: number };

  return NextResponse.json(
    {
      id: userId,
      name,
      email: syntheticEmail,
      image: null,
      iban: null,
      joined_at: joined.joined_at,
      is_placeholder: true,
      claim_code: claimCode,
    },
    { status: 201 }
  );
}
