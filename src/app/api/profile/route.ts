import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, name, image, iban FROM users WHERE id = ?")
    .get(session.user.id) as {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      iban: string | null;
    } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { iban?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const iban = body.iban?.trim() ?? null;

  const db = getDb();
  db.prepare("UPDATE users SET iban = ? WHERE id = ?").run(iban || null, session.user.id);

  const user = db
    .prepare("SELECT id, email, name, image, iban FROM users WHERE id = ?")
    .get(session.user.id);

  return NextResponse.json(user);
}
