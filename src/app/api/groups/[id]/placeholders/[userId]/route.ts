import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id: groupId, userId } = await params;

  const group = db
    .prepare("SELECT id, created_by FROM groups WHERE id = ?")
    .get(groupId) as { id: string; created_by: string } | undefined;

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (group.created_by !== session.user.id) {
    return NextResponse.json({ error: "Only the group creator can remove placeholders" }, { status: 403 });
  }

  const target = db
    .prepare("SELECT id, is_placeholder FROM users WHERE id = ?")
    .get(userId) as { id: string; is_placeholder: number } | undefined;

  if (!target || target.is_placeholder !== 1) {
    return NextResponse.json({ error: "Placeholder not found" }, { status: 404 });
  }

  const refCount = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM expenses WHERE paid_by = ?) +
        (SELECT COUNT(*) FROM expense_splits WHERE user_id = ?) +
        (SELECT COUNT(*) FROM settlements WHERE from_user = ? OR to_user = ?) AS n`
    )
    .get(userId, userId, userId, userId) as { n: number };

  if (refCount.n > 0) {
    return NextResponse.json(
      { error: "Placeholder is referenced by expenses or settlements. Remove those first." },
      { status: 409 }
    );
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  return NextResponse.json({ success: true });
}
