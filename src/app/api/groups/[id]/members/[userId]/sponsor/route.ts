import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership, setSponsor, getSponsorsForGroup } from "@/lib/repositories/groupRepository";

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

  // Only the group creator can assign sponsors
  const db = await import("@/lib/db").then((m) => m.default());
  const group = db
    .prepare("SELECT created_by FROM groups WHERE id = ?")
    .get(groupId) as { created_by: string } | undefined;
  if (!group || group.created_by !== session.user.id) {
    return NextResponse.json({ error: "Only the group creator can assign sponsors" }, { status: 403 });
  }

  // Verify target user is a member of the group
  const targetMembership = getGroupMembership(groupId, userId);
  if (!targetMembership) {
    return NextResponse.json({ error: "Target user is not a member of this group" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("sponsorId" in body)) {
    return NextResponse.json({ error: "sponsorId is required" }, { status: 400 });
  }

  const { sponsorId } = body as { sponsorId: unknown };
  if (sponsorId !== null && typeof sponsorId !== "string") {
    return NextResponse.json({ error: "sponsorId must be a string or null" }, { status: 400 });
  }

  const sponsors = getSponsorsForGroup(groupId);

  // If setting a sponsor, verify sponsor is a member and prevent circular sponsorship
  if (sponsorId) {
    if (sponsorId === userId) {
      return NextResponse.json({ error: "A member cannot sponsor themselves" }, { status: 400 });
    }
    const sponsorMembership = getGroupMembership(groupId, sponsorId);
    if (!sponsorMembership) {
      return NextResponse.json({ error: "Sponsor is not a member of this group" }, { status: 400 });
    }
    // Disallow placeholder users as sponsors
    const sponsorUser = db
      .prepare("SELECT is_placeholder FROM users WHERE id = ?")
      .get(sponsorId) as { is_placeholder: number } | undefined;
    if (sponsorUser?.is_placeholder) {
      return NextResponse.json({ error: "A placeholder member cannot be a sponsor" }, { status: 400 });
    }
    // Prevent circular sponsorship: the sponsor must not themselves be sponsored by this user
    const sponsorEntry = sponsors.find((s) => s.user_id === sponsorId);
    if (sponsorEntry && sponsorEntry.sponsored_by === userId) {
      return NextResponse.json({ error: "Circular sponsorship is not allowed" }, { status: 400 });
    }
    // Prevent chains: the sponsor must not already be sponsored by someone
    if (sponsorEntry) {
      return NextResponse.json({ error: "Cannot assign a sponsor who is already sponsored by someone else" }, { status: 400 });
    }
    // Prevent chains: userId must not already be sponsoring another member
    const alreadySponsoringEntry = sponsors.find((s) => s.sponsored_by === userId);
    if (alreadySponsoringEntry) {
      return NextResponse.json({ error: "This member is already acting as a sponsor and cannot also be sponsored" }, { status: 400 });
    }
  }

  setSponsor(groupId, userId, sponsorId ?? null);

  return NextResponse.json({ success: true });
}
