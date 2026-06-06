import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership } from "@/lib/repositories/groupRepository";
import { calculateGroupBalances } from "@/lib/balance";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Verify membership
  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const balances = calculateGroupBalances(groupId);

  return NextResponse.json(balances);
}
