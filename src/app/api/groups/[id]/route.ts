import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership, getGroupById, getGroupMembers, deleteGroup } from "@/lib/repositories/groupRepository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify membership
  const membership = getGroupMembership(id, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = getGroupById(id);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const isCreator = group.created_by === session.user.id;

  const rawMembers = getGroupMembers(id);

  const members = rawMembers.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    image: m.image,
    iban: m.iban,
    joined_at: m.joined_at,
    is_placeholder: m.is_placeholder,
    claim_code: isCreator ? m.claim_code : null,
  }));

  return NextResponse.json({
    ...group,
    view_code: isCreator ? group.view_code : null,
    members,
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const group = getGroupById(id);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.created_by !== session.user.id) {
    return NextResponse.json({ error: "Only the creator can delete this group" }, { status: 403 });
  }

  deleteGroup(id);

  return NextResponse.json({ success: true });
}
