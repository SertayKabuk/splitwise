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

describe("POST /api/groups/[id]/settle", () => {
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

  it("returns 403 when user tries to settle someone else's debt", async () => {
    const req = new NextRequest("http://localhost/api/groups/g1/settle", {
      method: "POST",
      body: JSON.stringify({
        fromUser: "u2",
        toUser: "u1",
        amount: 25,
        currency: "TRY",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "You can only settle your own debts" });
  });

  it("creates a settlement when the debtor records their own payment", async () => {
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "u2" } });
    (randomUUID as unknown as Mock).mockReturnValue("settlement-1");

    const req = new NextRequest("http://localhost/api/groups/g1/settle", {
      method: "POST",
      body: JSON.stringify({
        fromUser: "u2",
        toUser: "u1",
        amount: 25,
        currency: "TRY",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });

    const settlement = db
      .prepare("SELECT id, group_id, from_user, to_user, amount, currency FROM settlements WHERE id = ?")
      .get("settlement-1") as {
        id: string;
        group_id: string;
        from_user: string;
        to_user: string;
        amount: number;
        currency: string;
      };

    expect(settlement).toEqual({
      id: "settlement-1",
      group_id: "g1",
      from_user: "u2",
      to_user: "u1",
      amount: 25,
      currency: "TRY",
    });
  });
});
