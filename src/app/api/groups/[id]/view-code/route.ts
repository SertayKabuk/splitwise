import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomBytes } from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { id } = await params;

  const group = db
    .prepare("SELECT id, created_by FROM groups WHERE id = ?")
    .get(id) as { id: string; created_by: string } | undefined;

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (group.created_by !== session.user.id) {
    return NextResponse.json(
      { error: "Only the group creator can rotate the read-only link" },
      { status: 403 }
    );
  }

  const viewCode = randomBytes(16).toString("hex");
  db.prepare("UPDATE groups SET view_code = ? WHERE id = ?").run(viewCode, id);

  return NextResponse.json({ view_code: viewCode });
}
