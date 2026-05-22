import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getGroupByInviteCode, getGroupMembership, getGroupMembers } from "@/lib/repositories/groupRepository";
import JoinGroupClient from "./JoinGroupClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const session = await auth();
  const { code } = await params;

  // Fetch group info
  const group = getGroupByInviteCode(code);

  if (!group) {
    notFound();
  }

  // If authenticated, check if already a member
  if (session?.user?.id) {
    const membership = getGroupMembership(group.id, session.user.id);

    if (membership) {
      redirect(`/groups/${group.id}`);
    }
  }

  // Fetch current members for display
  const members = getGroupMembers(group.id);

  return (
    <JoinGroupClient
      group={group}
      members={members}
      inviteCode={code}
      isAuthenticated={!!session?.user?.id}
    />
  );
}
