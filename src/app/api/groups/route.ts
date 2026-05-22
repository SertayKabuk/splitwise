import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserGroups, createGroupWithMember, getGroupById } from "@/lib/repositories/groupRepository";
import { randomUUID, randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = getUserGroups(session.user.id);

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

  const groupId = randomUUID();
  const inviteCode = randomBytes(4).toString("hex");

  createGroupWithMember(
    {
      id: groupId,
      name: name.trim(),
      description: description?.trim() ?? null,
      invite_code: inviteCode,
      created_by: session.user.id,
    },
    {
      id: randomUUID(),
      group_id: groupId,
      user_id: session.user.id,
    }
  );

  const group = getGroupById(groupId);
  return NextResponse.json(group, { status: 201 });
}
