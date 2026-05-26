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

import { PUT } from "./route";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

describe("PUT /api/groups/[id]/members/[userId]/sponsor", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedBasicGroup(db);
    (getDb as unknown as Mock).mockReturnValue(db);
    // u1 is the group creator
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "u1" } });
  });

  afterEach(() => {
    db.close();
  });

  const makeReq = (body: unknown) =>
    new NextRequest("http://localhost/api/groups/g1/members/u2/sponsor", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

  const routeParams = (userId = "u2") =>
    ({ params: Promise.resolve({ id: "g1", userId }) });

  it("returns 401 when unauthenticated", async () => {
    (auth as unknown as Mock).mockResolvedValue(null);
    const res = await PUT(makeReq({ sponsorId: "u3" }), routeParams());
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when caller is not a member of the group", async () => {
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "outsider" } });
    const res = await PUT(makeReq({ sponsorId: "u3" }), routeParams());
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 403 when caller is a member but not the group creator", async () => {
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "u2" } });
    const res = await PUT(makeReq({ sponsorId: "u3" }), routeParams("u3"));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Only the group creator can assign sponsors" });
  });

  it("returns 404 when target user is not in the group", async () => {
    const res = await PUT(makeReq({ sponsorId: "u3" }), routeParams("outsider"));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Target user is not a member of this group" });
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/groups/g1/members/u2/sponsor", {
      method: "PUT",
      body: "not-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PUT(req, routeParams());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 when sponsorId is undefined (missing from body)", async () => {
    const res = await PUT(makeReq({}), routeParams());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "sponsorId is required" });
  });

  it("returns 400 when sponsorId is a number instead of string or null", async () => {
    const res = await PUT(makeReq({ sponsorId: 42 }), routeParams());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "sponsorId must be a string or null" });
  });

  it("returns 400 for self-sponsorship", async () => {
    const res = await PUT(makeReq({ sponsorId: "u2" }), routeParams("u2"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "A member cannot sponsor themselves" });
  });

  it("returns 400 when sponsorId is not a member of the group", async () => {
    const res = await PUT(makeReq({ sponsorId: "outsider" }), routeParams());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Sponsor is not a member of this group" });
  });

  it("returns 400 when sponsor is a placeholder", async () => {
    db.prepare("INSERT INTO users (id, email, name, is_placeholder, claim_code) VALUES (?, ?, ?, 1, ?)").run(
      "placeholder-1",
      "placeholder-1@placeholder.local",
      "Ghost",
      "claim-abc"
    );
    db.prepare("INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)").run(
      "gm-placeholder",
      "g1",
      "placeholder-1"
    );
    const res = await PUT(makeReq({ sponsorId: "placeholder-1" }), routeParams());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "A placeholder member cannot be a sponsor" });
  });

  it("returns 400 when sponsor is already sponsored by someone", async () => {
    // u3 is sponsored by u1, so u3 cannot be a sponsor for u2
    db.prepare("UPDATE group_members SET sponsored_by = ? WHERE group_id = ? AND user_id = ?").run("u1", "g1", "u3");
    const res = await PUT(makeReq({ sponsorId: "u3" }), routeParams());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Cannot assign a sponsor who is already sponsored by someone else" });
  });

  it("returns 400 when userId is already sponsoring another member", async () => {
    // u2 is already acting as sponsor for u3, so u2 cannot itself be sponsored (would create a chain)
    db.prepare("UPDATE group_members SET sponsored_by = ? WHERE group_id = ? AND user_id = ?").run("u2", "g1", "u3");
    // Try to assign u1 as the sponsor of u2 — u2 is already sponsoring u3, so this must be rejected
    const res = await PUT(makeReq({ sponsorId: "u1" }), routeParams("u2"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "This member is already acting as a sponsor and cannot also be sponsored" });
  });

  it("returns 400 for circular sponsorship", async () => {
    // Set u2 as u1's sponsor, then attempt the reverse (circular)
    db.prepare("UPDATE group_members SET sponsored_by = ? WHERE group_id = ? AND user_id = ?").run("u2", "g1", "u1");
    const res = await PUT(makeReq({ sponsorId: "u1" }), routeParams("u2"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Circular sponsorship is not allowed" });
  });

  it("successfully assigns a sponsor", async () => {
    const res = await PUT(makeReq({ sponsorId: "u3" }), routeParams());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });

    const row = db
      .prepare("SELECT sponsored_by FROM group_members WHERE group_id = ? AND user_id = ?")
      .get("g1", "u2") as { sponsored_by: string | null };
    expect(row.sponsored_by).toBe("u3");
  });

  it("successfully clears a sponsor when sponsorId is null", async () => {
    db.prepare("UPDATE group_members SET sponsored_by = ? WHERE group_id = ? AND user_id = ?").run("u3", "g1", "u2");

    const res = await PUT(makeReq({ sponsorId: null }), routeParams());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });

    const row = db
      .prepare("SELECT sponsored_by FROM group_members WHERE group_id = ? AND user_id = ?")
      .get("g1", "u2") as { sponsored_by: string | null };
    expect(row.sponsored_by).toBeNull();
  });
});
