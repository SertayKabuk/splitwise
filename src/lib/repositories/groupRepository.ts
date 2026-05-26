import getDb from "@/lib/db";

export interface DbGroup {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  view_code: string | null;
  created_by: string;
  created_at: number;
}

export interface GroupWithCounts extends DbGroup {
  member_count: number;
  expense_count: number;
}

export interface DbGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: number;
}

export interface GroupMemberWithUser {
  id: string; // user.id
  name: string | null;
  email: string;
  image: string | null;
  iban: string | null;
  is_placeholder: boolean;
  claim_code: string | null;
  sponsored_by: string | null;
  joined_at: number;
}

export function getUserGroups(userId: string): GroupWithCounts[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.invite_code,
        g.view_code,
        g.created_by,
        g.created_at,
        (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count,
        (SELECT COUNT(*) FROM expenses e WHERE e.group_id = g.id) as expense_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      ORDER BY g.created_at DESC
      `
    )
    .all(userId) as GroupWithCounts[];
}

export function createGroup(group: {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  view_code: string | null;
  created_by: string;
}): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO groups (id, name, description, invite_code, view_code, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(group.id, group.name, group.description, group.invite_code, group.view_code, group.created_by);
}

export function addGroupMember(member: {
  id: string;
  group_id: string;
  user_id: string;
}): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)"
  ).run(member.id, member.group_id, member.user_id);
}

export function getGroupById(groupId: string): DbGroup | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, name, description, invite_code, view_code, created_by, created_at FROM groups WHERE id = ?"
    )
    .get(groupId) as DbGroup | undefined;
}

export function getGroupMembers(groupId: string): GroupMemberWithUser[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT u.id, u.name, u.email, u.image, u.iban, u.is_placeholder, u.claim_code, gm.sponsored_by, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at ASC
      `
    )
    .all(groupId) as Array<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      iban: string | null;
      is_placeholder: number;
      claim_code: string | null;
      sponsored_by: string | null;
      joined_at: number;
    }>;
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    image: m.image,
    iban: m.iban,
    is_placeholder: m.is_placeholder === 1,
    claim_code: m.claim_code,
    sponsored_by: m.sponsored_by,
    joined_at: m.joined_at,
  }));
}

export function getValidGroupMemberIds(groupId: string, userIds: string[]): string[] {
  if (userIds.length === 0) return [];
  const db = getDb();
  const placeholders = userIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT user_id FROM group_members WHERE group_id = ? AND user_id IN (${placeholders})`
    )
    .all(groupId, ...userIds) as Array<{ user_id: string }>;
  return rows.map((r) => r.user_id);
}

export function getGroupMembership(groupId: string, userId: string): DbGroupMember | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, group_id, user_id, joined_at FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, userId) as DbGroupMember | undefined;
}

export function deleteGroup(groupId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM groups WHERE id = ?").run(groupId);
}

export function getGroupByInviteCode(
  inviteCode: string
): (DbGroup & { member_count: number }) | undefined {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.invite_code,
        g.view_code,
        g.created_by,
        g.created_at,
        COUNT(gm.id) as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.invite_code = ?
      GROUP BY g.id
      `
    )
    .get(inviteCode) as (DbGroup & { member_count: number }) | undefined;
}

export function getGroupByIdFromInviteCode(inviteCode: string): { id: string } | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id FROM groups WHERE invite_code = ?")
    .get(inviteCode) as { id: string } | undefined;
}

export function setSponsor(groupId: string, userId: string, sponsorId: string | null): void {
  const db = getDb();
  db.prepare(
    "UPDATE group_members SET sponsored_by = ? WHERE group_id = ? AND user_id = ?"
  ).run(sponsorId, groupId, userId);
}

export function getSponsorsForGroup(groupId: string): Array<{ user_id: string; sponsored_by: string }> {
  const db = getDb();
  return db
    .prepare(
      "SELECT user_id, sponsored_by FROM group_members WHERE group_id = ? AND sponsored_by IS NOT NULL"
    )
    .all(groupId) as Array<{ user_id: string; sponsored_by: string }>;
}

export function createGroupWithMember(
  group: { id: string; name: string; description: string | null; invite_code: string; view_code: string | null; created_by: string },
  member: { id: string; group_id: string; user_id: string }
): void {
  const db = getDb();
  db.transaction(() => {
    createGroup(group);
    addGroupMember(member);
  })();
}
