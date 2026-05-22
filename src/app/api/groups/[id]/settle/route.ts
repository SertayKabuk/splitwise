import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership } from "@/lib/repositories/groupRepository";
import { createSettlement } from "@/lib/repositories/settlementRepository";
import { randomUUID } from "crypto";
import { CURRENCIES } from "@/lib/currencies";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Verify requester is a group member
  const membership = getGroupMembership(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { fromUser?: string; toUser?: string; amount?: number; currency?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fromUser, toUser, amount, currency } = body;

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
  if (!currency || !(currency in CURRENCIES)) {
    return NextResponse.json({ error: "A valid currency is required" }, { status: 400 });
  }
  if (fromUser !== session.user.id && toUser !== session.user.id) {
    return NextResponse.json(
      { error: "Only the payer or recipient can record this settlement" },
      { status: 403 }
    );
  }

  // Validate both users are group members
  const fromMembership = getGroupMembership(groupId, fromUser);
  if (!fromMembership) {
    return NextResponse.json({ error: "fromUser is not a group member" }, { status: 400 });
  }

  const toMembership = getGroupMembership(groupId, toUser);
  if (!toMembership) {
    return NextResponse.json({ error: "toUser is not a group member" }, { status: 400 });
  }

  createSettlement({
    id: randomUUID(),
    group_id: groupId,
    from_user: fromUser,
    to_user: toUser,
    amount,
    currency,
  });

  return NextResponse.json({ success: true });
}
