import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import getDb from "@/lib/db";
import ClaimClient from "./ClaimClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ClaimPage({ params }: PageProps) {
  const session = await auth();
  const db = getDb();
  const { code } = await params;

  const placeholder = db
    .prepare("SELECT id, name FROM users WHERE claim_code = ? AND is_placeholder = 1")
    .get(code) as { id: string; name: string | null } | undefined;

  if (!placeholder) {
    notFound();
  }

  const groups = db
    .prepare(
      `SELECT g.id, g.name
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = ?
       ORDER BY g.created_at ASC`
    )
    .all(placeholder.id) as Array<{ id: string; name: string }>;

  return (
    <ClaimClient
      code={code}
      placeholderName={placeholder.name ?? "this person"}
      groups={groups}
      isAuthenticated={!!session?.user?.id}
    />
  );
}
