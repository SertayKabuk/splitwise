import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

declare global {
  var __db: Database.Database | undefined;
}

export const createTablesScript = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      image TEXT,
      iban TEXT,
      is_placeholder INTEGER NOT NULL DEFAULT 0,
      claim_code TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_claim_code_unique
      ON users(claim_code) WHERE claim_code IS NOT NULL;

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      invite_code TEXT UNIQUE NOT NULL,
      view_code TEXT,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE UNIQUE INDEX IF NOT EXISTS groups_view_code_unique
      ON groups(view_code) WHERE view_code IS NOT NULL;

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sponsored_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      paid_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      split_type TEXT NOT NULL DEFAULT 'equal',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      shares INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      from_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      settled_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `;

function createDb(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "splitwise.db");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(createTablesScript);
  migrate(db);

  return db;
}

function migrate(db: Database.Database) {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const userColNames = new Set(userCols.map((c) => c.name));
  if (!userColNames.has("is_placeholder")) {
    db.exec("ALTER TABLE users ADD COLUMN is_placeholder INTEGER NOT NULL DEFAULT 0");
  }
  if (!userColNames.has("claim_code")) {
    db.exec("ALTER TABLE users ADD COLUMN claim_code TEXT");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_claim_code_unique ON users(claim_code) WHERE claim_code IS NOT NULL"
  );

  const gmCols = db.prepare("PRAGMA table_info(group_members)").all() as Array<{ name: string }>;
  const gmColNames = new Set(gmCols.map((c) => c.name));
  if (!gmColNames.has("sponsored_by")) {
    db.exec("ALTER TABLE group_members ADD COLUMN sponsored_by TEXT REFERENCES users(id) ON DELETE SET NULL");
  }

  const groupCols = db.prepare("PRAGMA table_info(groups)").all() as Array<{ name: string }>;
  const groupColNames = new Set(groupCols.map((c) => c.name));
  if (!groupColNames.has("view_code")) {
    db.exec("ALTER TABLE groups ADD COLUMN view_code TEXT");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS groups_view_code_unique ON groups(view_code) WHERE view_code IS NOT NULL"
  );

  // Backfill view_code for groups created before this feature.
  const missing = db
    .prepare("SELECT id FROM groups WHERE view_code IS NULL")
    .all() as Array<{ id: string }>;
  if (missing.length > 0) {
    const update = db.prepare("UPDATE groups SET view_code = ? WHERE id = ?");
    db.transaction(() => {
      for (const { id } of missing) {
        update.run(randomBytes(16).toString("hex"), id);
      }
    })();
  }
}

export function getDb(): Database.Database {
    if (!global.__db) {
      global.__db = createDb();
    }
    return global.__db;
}

export default getDb;
