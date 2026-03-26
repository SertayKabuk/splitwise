export type SplitType = "equal" | "shares";

export interface SplitInput {
  userId: string;
  shares: number;
}

export interface SplitResult {
  userId: string;
  amount: number;
}

export function computeSplits(
  totalAmount: number,
  splitWith: SplitInput[],
  splitType: SplitType
): SplitResult[] {
  if (splitWith.length === 0) return [];

  if (splitType === "equal") {
    const perPerson = Math.floor((totalAmount / splitWith.length) * 100) / 100;
    const remainder = Math.round((totalAmount - perPerson * splitWith.length) * 100);
    return splitWith.map(({ userId }, i) => ({
      userId,
      amount: i < remainder ? perPerson + 0.01 : perPerson,
    }));
  }

  // Shares-based: proportional to share count
  const totalShares = splitWith.reduce((sum, { shares }) => sum + shares, 0);
  if (totalShares === 0) return splitWith.map(({ userId }) => ({ userId, amount: 0 }));

  const results = splitWith.map(({ userId, shares }) => ({
    userId,
    amount: Math.floor((totalAmount * shares / totalShares) * 100) / 100,
  }));
  const allocated = results.reduce((sum, r) => sum + Math.round(r.amount * 100), 0);
  const totalCents = Math.round(totalAmount * 100);
  let remainderCents = totalCents - allocated;
  for (let i = 0; remainderCents > 0 && i < results.length; i++) {
    results[i].amount = Math.round((results[i].amount + 0.01) * 100) / 100;
    remainderCents--;
  }

  return results;
}
