import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { createTestDb, seedBasicGroup } from "@/test/dbTestUtils";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    default: vi.fn(),
  };
});
vi.mock("crypto", () => ({ randomUUID: vi.fn() }));

import { DELETE, PUT } from "./route";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

describe("PUT/DELETE /api/groups/[id]/expenses/[expenseId]", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedBasicGroup(db);

    db.prepare(
      "INSERT INTO expenses (id, group_id, title, amount, currency, paid_by, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("e1", "g1", "Initial", 90, "TRY", "u1", "equal");

    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run(
      "s1",
      "e1",
      "u1",
      30,
      1
    );
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run(
      "s2",
      "e1",
      "u2",
      30,
      1
    );
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run(
      "s3",
      "e1",
      "u3",
      30,
      1
    );

    (getDb as unknown as Mock).mockReturnValue(db);
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "u1" } });
  });

  afterEach(() => {
    db.close();
  });

  it("forbids editing by non-payer", async () => {
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "u2" } });

    const req = new NextRequest("http://localhost/api/groups/g1/expenses/e1", {
      method: "PUT",
      body: JSON.stringify({
        title: "Edited",
        amount: 100,
        currency: "USD",
        paidBy: "u2",
        splitType: "equal",
        splitWith: [
          { userId: "u1", shares: 1 },
          { userId: "u2", shares: 1 },
        ],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "g1", expenseId: "e1" }) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Only the expense payer can edit it" });
  });

  it("updates expense and rewrites splits", async () => {
    (randomUUID as unknown as Mock).mockReturnValueOnce("ns1").mockReturnValueOnce("ns2").mockReturnValueOnce("ns3");

    const req = new NextRequest("http://localhost/api/groups/g1/expenses/e1", {
      method: "PUT",
      body: JSON.stringify({
        title: "Edited",
        amount: 10,
        currency: "EUR",
        paidBy: "u1",
        splitType: "shares",
        splitWith: [
          { userId: "u1", shares: 1 },
          { userId: "u2", shares: 2 },
          { userId: "u3", shares: 3 },
        ],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "g1", expenseId: "e1" }) });

    expect(res.status).toBe(200);

    const updated = db
      .prepare("SELECT title, amount, currency, paid_by, split_type FROM expenses WHERE id = ?")
      .get("e1") as {
      title: string;
      amount: number;
      currency: string;
      paid_by: string;
      split_type: string;
    };

    expect(updated).toEqual({
      title: "Edited",
      amount: 10,
      currency: "EUR",
      paid_by: "u1",
      split_type: "shares",
    });

    const splits = db
      .prepare("SELECT user_id, amount, shares FROM expense_splits WHERE expense_id = ? ORDER BY user_id")
      .all("e1") as Array<{ user_id: string; amount: number; shares: number }>;

    expect(splits).toEqual([
      { user_id: "u1", amount: 1.67, shares: 1 },
      { user_id: "u2", amount: 3.33, shares: 2 },
      { user_id: "u3", amount: 5, shares: 3 },
    ]);
  });

  it("deletes expense and associated splits for payer", async () => {
    const req = new NextRequest("http://localhost/api/groups/g1/expenses/e1", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "g1", expenseId: "e1" }) });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });

    const expenseCount = db.prepare("SELECT COUNT(*) as count FROM expenses WHERE id = ?").get("e1") as { count: number };
    const splitCount = db
      .prepare("SELECT COUNT(*) as count FROM expense_splits WHERE expense_id = ?")
      .get("e1") as { count: number };

    expect(expenseCount.count).toBe(0);
    expect(splitCount.count).toBe(0);
  });
});
