import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id: groupId } = await params;

  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settlements = db
    .prepare(
      `SELECT s.id, s.from_user, s.to_user, s.amount, s.currency, s.settled_at,
              fu.name as from_name, fu.email as from_email,
              tu.name as to_name, tu.email as to_email
       FROM settlements s
       JOIN users fu ON s.from_user = fu.id
       JOIN users tu ON s.to_user = tu.id
       WHERE s.group_id = ?
       ORDER BY s.settled_at DESC`
    )
    .all(groupId) as Array<{
      id: string;
      from_user: string;
      to_user: string;
      amount: number;
      currency: string;
      settled_at: number;
      from_name: string | null;
      from_email: string;
      to_name: string | null;
      to_email: string;
    }>;

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
