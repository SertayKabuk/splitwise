import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const db = getDb();
  const { code } = await params;

  const placeholder = db
    .prepare("SELECT id, name FROM users WHERE claim_code = ? AND is_placeholder = 1")
    .get(code) as { id: string; name: string | null } | undefined;

  if (!placeholder) {
    return NextResponse.json({ error: "Invalid or already-claimed link" }, { status: 404 });
  }

  const groups = db
    .prepare(
      `SELECT g.id, g.name
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = ?`
    )
    .all(placeholder.id) as Array<{ id: string; name: string }>;

  return NextResponse.json({
    placeholderId: placeholder.id,
    placeholderName: placeholder.name,
    groups,
  });
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { code } = await params;

  const placeholder = db
    .prepare("SELECT id FROM users WHERE claim_code = ? AND is_placeholder = 1")
    .get(code) as { id: string } | undefined;

  if (!placeholder) {
    return NextResponse.json({ error: "Invalid or already-claimed link" }, { status: 404 });
  }

  const realUserId = session.user.id;
  if (realUserId === placeholder.id) {
    return NextResponse.json({ error: "Already claimed" }, { status: 400 });
  }

  // Collect the groups the placeholder belongs to so we can redirect at the end.
  const placeholderGroups = db
    .prepare("SELECT group_id FROM group_members WHERE user_id = ?")
    .all(placeholder.id) as Array<{ group_id: string }>;

  db.transaction(() => {
    // Re-point ownership/identity references from the placeholder to the real user.
    db.prepare("UPDATE expenses SET paid_by = ? WHERE paid_by = ?").run(realUserId, placeholder.id);
    db.prepare("UPDATE expense_splits SET user_id = ? WHERE user_id = ?").run(realUserId, placeholder.id);
    db.prepare("UPDATE settlements SET from_user = ? WHERE from_user = ?").run(realUserId, placeholder.id);
    db.prepare("UPDATE settlements SET to_user = ? WHERE to_user = ?").run(realUserId, placeholder.id);

    // Migrate group memberships, respecting the UNIQUE(group_id, user_id) constraint.
    for (const { group_id } of placeholderGroups) {
      const existing = db
        .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
        .get(group_id, realUserId) as { id: string } | undefined;

      if (existing) {
        db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(
          group_id,
          placeholder.id
        );
      } else {
        db.prepare(
          "UPDATE group_members SET user_id = ?, id = ? WHERE group_id = ? AND user_id = ?"
        ).run(realUserId, randomUUID(), group_id, placeholder.id);
      }
    }

    // Placeholder is now orphaned — delete its user row.
    db.prepare("DELETE FROM users WHERE id = ?").run(placeholder.id);
  })();

  return NextResponse.json({
    success: true,
    groupId: placeholderGroups[0]?.group_id ?? null,
  });
}
