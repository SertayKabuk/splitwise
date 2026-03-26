import { createTablesScript } from "@/lib/db";
import Database from "better-sqlite3";

export function createTestDb() {
  const db = new Database(":memory:");

  db.pragma("foreign_keys = ON");

  db.exec(createTablesScript);

  return db;
}

export function seedBasicGroup(db: Database.Database, opts?: { groupId?: string; users?: string[] }) {
  const groupId = opts?.groupId ?? "g1";
  const users = opts?.users ?? ["u1", "u2", "u3"];

  for (const userId of users) {
    db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(
      userId,
      `${userId}@example.com`,
      userId.toUpperCase()
    );
  }

  db.prepare("INSERT INTO groups (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)").run(
    groupId,
    "Test Group",
    "invite-1",
    users[0]
  );

  for (const [idx, userId] of users.entries()) {
    db.prepare("INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)").run(
      `gm-${idx + 1}`,
      groupId,
      userId
    );
  }

  return { groupId, users };
}
