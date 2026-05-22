import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupByInviteCode, getGroupByIdFromInviteCode, getGroupMembership, addGroupMember } from "@/lib/repositories/groupRepository";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { code } = await params;

  const group = getGroupByInviteCode(code);

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

  const { code } = await params;

  const group = getGroupByIdFromInviteCode(code);

  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Check if already a member
  const existing = getGroupMembership(group.id, session.user.id);

  if (existing) {
    return NextResponse.json({ groupId: group.id, alreadyMember: true });
  }

  addGroupMember({
    id: randomUUID(),
    group_id: group.id,
    user_id: session.user.id,
  });

  return NextResponse.json({ groupId: group.id, alreadyMember: false });
}
