import getDb from "@/lib/db";

export interface DbSettlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  settled_at: number;
}

export interface SettlementWithUsers extends DbSettlement {
  from_name: string | null;
  from_email: string;
  to_name: string | null;
  to_email: string;
}

export function getSettlementsByGroupId(groupId: string): SettlementWithUsers[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        s.id,
        s.group_id,
        s.from_user,
        s.to_user,
        s.amount,
        s.currency,
        s.settled_at,
        fu.name as from_name,
        fu.email as from_email,
        tu.name as to_name,
        tu.email as to_email
      FROM settlements s
      JOIN users fu ON s.from_user = fu.id
      JOIN users tu ON s.to_user = tu.id
      WHERE s.group_id = ?
      ORDER BY s.settled_at DESC
      `
    )
    .all(groupId) as SettlementWithUsers[];
}

export function getSettlementsByUserGroups(
  userId: string
): Array<{ group_id: string; from_user: string; to_user: string; amount: number; currency: string }> {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT group_id, from_user, to_user, amount, currency
      FROM settlements
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
      `
    )
    .all(userId) as Array<{
    group_id: string;
    from_user: string;
    to_user: string;
    amount: number;
    currency: string;
  }>;
}

export function createSettlement(settlement: {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
}): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO settlements (id, group_id, from_user, to_user, amount, currency) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    settlement.id,
    settlement.group_id,
    settlement.from_user,
    settlement.to_user,
    settlement.amount,
    settlement.currency
  );
}
