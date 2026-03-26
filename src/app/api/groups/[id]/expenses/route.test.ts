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

import { POST } from "./route";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

describe("POST /api/groups/[id]/expenses", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedBasicGroup(db);
    (getDb as unknown as Mock).mockReturnValue(db);
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "u1" } });
  });

  afterEach(() => {
    db.close();
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as unknown as Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/groups/g1/expenses", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid currency", async () => {
    const req = new NextRequest("http://localhost/api/groups/g1/expenses", {
      method: "POST",
      body: JSON.stringify({
        title: "Dinner",
        amount: 120,
        currency: "JPY",
        paidBy: "u1",
        splitType: "equal",
        splitWith: [
          { userId: "u1", shares: 1 },
          { userId: "u2", shares: 1 },
        ],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "A valid currency is required" });
  });

  it("creates expense and persists computed splits with original shares", async () => {
    (randomUUID as unknown as Mock)
      .mockReturnValueOnce("expense-1")
      .mockReturnValueOnce("split-1")
      .mockReturnValueOnce("split-2")
      .mockReturnValueOnce("split-3");

    const req = new NextRequest("http://localhost/api/groups/g1/expenses", {
      method: "POST",
      body: JSON.stringify({
        title: "Market",
        amount: 10,
        currency: "USD",
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

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) });

    expect(res.status).toBe(201);

    const expense = db.prepare("SELECT id, title, amount, currency, paid_by, split_type FROM expenses WHERE id = ?").get("expense-1") as {
      id: string;
      title: string;
      amount: number;
      currency: string;
      paid_by: string;
      split_type: string;
    };
    expect(expense).toEqual({
      id: "expense-1",
      title: "Market",
      amount: 10,
      currency: "USD",
      paid_by: "u1",
      split_type: "shares",
    });

    const splits = db
      .prepare("SELECT user_id, amount, shares FROM expense_splits WHERE expense_id = ? ORDER BY user_id")
      .all("expense-1") as Array<{ user_id: string; amount: number; shares: number }>;

    expect(splits).toEqual([
      { user_id: "u1", amount: 1.67, shares: 1 },
      { user_id: "u2", amount: 3.33, shares: 2 },
      { user_id: "u3", amount: 5, shares: 3 },
    ]);
  });
});
