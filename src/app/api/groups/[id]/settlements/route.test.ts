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

import { GET } from "./route";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

describe("GET /api/groups/[id]/settlements", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedBasicGroup(db);
    (getDb as unknown as Mock).mockReturnValue(db);
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "u1" } });

    db.prepare(
      "INSERT INTO settlements (id, group_id, from_user, to_user, amount, currency, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("st-1", "g1", "u2", "u1", 15, "USD", 1700000000);
    db.prepare(
      "INSERT INTO settlements (id, group_id, from_user, to_user, amount, currency, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("st-2", "g1", "u3", "u1", 20, "TRY", 1700000100);
  });

  afterEach(() => {
    db.close();
  });

  it("returns settlements newest first with user display names", async () => {
    const req = new NextRequest("http://localhost/api/groups/g1/settlements");

    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      {
        id: "st-2",
        fromUserId: "u3",
        fromUserName: "U3",
        toUserId: "u1",
        toUserName: "U1",
        amount: 20,
        currency: "TRY",
        settledAt: 1700000100,
      },
      {
        id: "st-1",
        fromUserId: "u2",
        fromUserName: "U2",
        toUserId: "u1",
        toUserName: "U1",
        amount: 15,
        currency: "USD",
        settledAt: 1700000000,
      },
    ]);
  });
});
