import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership, setSponsor } from "@/lib/repositories/groupRepository";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId, userId } = await params;

  // Verify caller is a member of the group
  const membership = getGroupMembership(groupId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify target user is a member of the group
  const targetMembership = getGroupMembership(groupId, userId);
  if (!targetMembership) {
    return NextResponse.json({ error: "Target user is not a member of this group" }, { status: 404 });
  }

  const body = await req.json();
  const { sponsorId } = body as { sponsorId: string | null };

  // If setting a sponsor, verify sponsor is a member of the group
  if (sponsorId) {
    if (sponsorId === userId) {
      return NextResponse.json({ error: "A member cannot sponsor themselves" }, { status: 400 });
    }
    const sponsorMembership = getGroupMembership(groupId, sponsorId);
    if (!sponsorMembership) {
      return NextResponse.json({ error: "Sponsor is not a member of this group" }, { status: 400 });
    }
  }

  setSponsor(groupId, userId, sponsorId ?? null);

  return NextResponse.json({ success: true });
}
