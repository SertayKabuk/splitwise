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
    const perPerson = Math.round((totalAmount / splitWith.length) * 100) / 100;
    return splitWith.map(({ userId }) => ({ userId, amount: perPerson }));
  }

  // Shares-based: proportional to share count
  const totalShares = splitWith.reduce((sum, { shares }) => sum + shares, 0);
  if (totalShares === 0) return splitWith.map(({ userId }) => ({ userId, amount: 0 }));

  return splitWith.map(({ userId, shares }) => ({
    userId,
    amount: Math.round((totalAmount * shares / totalShares) * 100) / 100,
  }));
}
