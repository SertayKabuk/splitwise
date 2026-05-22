import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership } from "@/lib/repositories/groupRepository";
import { getSettlementsByGroupId } from "@/lib/repositories/settlementRepository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settlements = getSettlementsByGroupId(groupId);

  return NextResponse.json(
    settlements.map((settlement) => ({
      id: settlement.id,
      fromUserId: settlement.from_user,
      fromUserName: settlement.from_name ?? settlement.from_email,
      toUserId: settlement.to_user,
      toUserName: settlement.to_name ?? settlement.to_email,
      amount: settlement.amount,
      currency: settlement.currency,
      settledAt: settlement.settled_at,
    }))
  );
}
