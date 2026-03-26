import { describe, expect, it } from "vitest";
import { computeSplits } from "./splits";

describe("computeSplits", () => {
  it("returns empty array when no participants provided", () => {
    expect(computeSplits(100, [], "equal")).toEqual([]);
  });

  it("splits equally when total divides cleanly", () => {
    const result = computeSplits(
      90,
      [
        { userId: "u1", shares: 1 },
        { userId: "u2", shares: 1 },
        { userId: "u3", shares: 1 },
      ],
      "equal"
    );

    expect(result).toEqual([
      { userId: "u1", amount: 30 },
      { userId: "u2", amount: 30 },
      { userId: "u3", amount: 30 },
    ]);
    expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(90);
  });

  it("distributes remainder cents in equal split", () => {
    const result = computeSplits(
      10,
      [
        { userId: "u1", shares: 1 },
        { userId: "u2", shares: 1 },
        { userId: "u3", shares: 1 },
      ],
      "equal"
    );

    expect(result).toEqual([
      { userId: "u1", amount: 3.34 },
      { userId: "u2", amount: 3.33 },
      { userId: "u3", amount: 3.33 },
    ]);
    expect(result.reduce((sum, s) => Math.round((sum + s.amount) * 100) / 100, 0)).toBe(10);
  });

  it("splits by share weights and keeps total exact", () => {
    const result = computeSplits(
      10,
      [
        { userId: "u1", shares: 1 },
        { userId: "u2", shares: 2 },
        { userId: "u3", shares: 3 },
      ],
      "shares"
    );

    expect(result).toEqual([
      { userId: "u1", amount: 1.67 },
      { userId: "u2", amount: 3.33 },
      { userId: "u3", amount: 5 },
    ]);
    expect(result.reduce((sum, s) => Math.round((sum + s.amount) * 100) / 100, 0)).toBe(10);
  });

  it("returns zero amounts when total shares are zero", () => {
    const result = computeSplits(
      15,
      [
        { userId: "u1", shares: 0 },
        { userId: "u2", shares: 0 },
      ],
      "shares"
    );

    expect(result).toEqual([
      { userId: "u1", amount: 0 },
      { userId: "u2", amount: 0 },
    ]);
  });
});
