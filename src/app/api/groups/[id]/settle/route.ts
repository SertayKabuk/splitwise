import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

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

  // Verify requester is a group member
  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { fromUser?: string; toUser?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fromUser, toUser, amount } = body;

  if (!fromUser || typeof fromUser !== "string") {
    return NextResponse.json({ error: "fromUser is required" }, { status: 400 });
  }
  if (!toUser || typeof toUser !== "string") {
    return NextResponse.json({ error: "toUser is required" }, { status: 400 });
  }
  if (fromUser === toUser) {
    return NextResponse.json({ error: "fromUser and toUser must be different" }, { status: 400 });
  }
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  // Validate both users are group members
  const fromMembership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, fromUser);
  if (!fromMembership) {
    return NextResponse.json({ error: "fromUser is not a group member" }, { status: 400 });
  }

  const toMembership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, toUser);
  if (!toMembership) {
    return NextResponse.json({ error: "toUser is not a group member" }, { status: 400 });
  }

  db.prepare(
    "INSERT INTO settlements (id, group_id, from_user, to_user, amount) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), groupId, fromUser, toUser, amount);

  return NextResponse.json({ success: true });
}
