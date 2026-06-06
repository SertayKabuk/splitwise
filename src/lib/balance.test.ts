import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb, seedBasicGroup } from "@/test/dbTestUtils";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    default: vi.fn(),
  };
});

import getDb from "@/lib/db";
import { calculateGroupBalances } from "./balance";

describe("calculateGroupBalances", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    (getDb as unknown as Mock).mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns empty debts array for a group with no expenses", () => {
    seedBasicGroup(db, { groupId: "g1", users: ["u1", "u2"] });
    const debts = calculateGroupBalances("g1");
    expect(debts).toEqual([]);
  });

  it("calculates correct debts for basic splits", () => {
    seedBasicGroup(db, { groupId: "g1", users: ["u1", "u2", "u3"] });

    // Add expense: u1 paid 90 USD, split equally among u1, u2, u3 (30 USD each)
    db.prepare(
      "INSERT INTO expenses (id, group_id, title, amount, currency, paid_by, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("e1", "g1", "Dinner", 90, "USD", "u1", "equal");

    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s1", "e1", "u1", 30, 1);
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s2", "e1", "u2", 30, 1);
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s3", "e1", "u3", 30, 1);

    const debts = calculateGroupBalances("g1");
    expect(debts).toEqual([
      {
        fromUserId: "u2",
        fromUserName: "U2",
        toUserId: "u1",
        toUserName: "U1",
        amount: 30,
        currency: "USD",
      },
      {
        fromUserId: "u3",
        fromUserName: "U3",
        toUserId: "u1",
        toUserName: "U1",
        amount: 30,
        currency: "USD",
      },
    ]);
  });

  it("considers sponsorships: shifts debtor to their sponsor", () => {
    seedBasicGroup(db, { groupId: "g1", users: ["u1", "u2", "u3"] });

    // Make u3 sponsor u2
    db.prepare("UPDATE group_members SET sponsored_by = ? WHERE group_id = ? AND user_id = ?").run("u3", "g1", "u2");

    // Add expense: u1 paid 90 USD, split equally among u1, u2, u3 (30 USD each)
    db.prepare(
      "INSERT INTO expenses (id, group_id, title, amount, currency, paid_by, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("e1", "g1", "Dinner", 90, "USD", "u1", "equal");

    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s1", "e1", "u1", 30, 1);
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s2", "e1", "u2", 30, 1);
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s3", "e1", "u3", 30, 1);

    const debts = calculateGroupBalances("g1");
    // Since u3 sponsors u2, u3 takes on u2's 30 USD debt. So u3 owes 60 USD to u1, and u2 owes nothing.
    expect(debts).toEqual([
      {
        fromUserId: "u3",
        fromUserName: "U3",
        toUserId: "u1",
        toUserName: "U1",
        amount: 60,
        currency: "USD",
      },
    ]);
  });

  it("takes into account settlements", () => {
    seedBasicGroup(db, { groupId: "g1", users: ["u1", "u2", "u3"] });

    // Add expense: u1 paid 90 USD, split equally (30 each)
    db.prepare(
      "INSERT INTO expenses (id, group_id, title, amount, currency, paid_by, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("e1", "g1", "Dinner", 90, "USD", "u1", "equal");

    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s1", "e1", "u1", 30, 1);
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s2", "e1", "u2", 30, 1);
    db.prepare("INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)").run("s3", "e1", "u3", 30, 1);

    // Add settlement: u2 settles 30 USD to u1
    db.prepare(
      "INSERT INTO settlements (id, group_id, from_user, to_user, amount, currency, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("settle1", "g1", "u2", "u1", 30, "USD", Math.floor(Date.now() / 1000));

    const debts = calculateGroupBalances("g1");
    // u2 is fully settled. Only u3 owes u1.
    expect(debts).toEqual([
      {
        fromUserId: "u3",
        fromUserName: "U3",
        toUserId: "u1",
        toUserName: "U1",
        amount: 30,
        currency: "USD",
      },
    ]);
  });
});
