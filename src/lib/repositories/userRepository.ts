import getDb from "@/lib/db";

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  iban: string | null;
  created_at: number;
}

export function getUserById(id: string): DbUser | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, email, name, image, iban, created_at FROM users WHERE id = ?")
    .get(id) as DbUser | undefined;
}

export function getUserByEmail(email: string): { id: string } | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: string } | undefined;
}

export function createUser(user: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}): void {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO users (id, email, name, image) VALUES (?, ?, ?, ?)"
  ).run(user.id, user.email, user.name, user.image);
}

export function updateUserProfile(
  email: string,
  profile: { name: string | null; image: string | null }
): void {
  const db = getDb();
  db.prepare(
    "UPDATE users SET name = ?, image = ? WHERE email = ?"
  ).run(profile.name, profile.image, email);
}

export function updateUserIban(userId: string, iban: string | null): void {
  const db = getDb();
  db.prepare("UPDATE users SET iban = ? WHERE id = ?").run(iban, userId);
}
