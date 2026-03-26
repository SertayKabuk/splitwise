export interface Member {
  id: string;
  name: string | null;
  email: string;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  paidBy: string;
  amount: number;
  currency: string;
  splits: ExpenseSplit[];
}

export interface Settlement {
  fromUser: string;
  toUser: string;
  amount: number;
  currency: string;
}

export interface Debt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

export function calculateBalances(
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[]
): Debt[] {
  const nameMap = new Map(members.map((m) => [m.id, m.name ?? m.email]));

  const currencies = Array.from(new Set([
    ...expenses.map((e) => e.currency),
    ...settlements.map((s) => s.currency),
  ]));

  const allDebts: Debt[] = [];

  for (const currency of currencies) {
    const balanceMap = new Map<string, number>(members.map((m) => [m.id, 0]));

    for (const expense of expenses.filter((e) => e.currency === currency)) {
      balanceMap.set(expense.paidBy, (balanceMap.get(expense.paidBy) ?? 0) + expense.amount);
      for (const split of expense.splits) {
        balanceMap.set(split.userId, (balanceMap.get(split.userId) ?? 0) - split.amount);
      }
    }

    for (const settlement of settlements.filter((s) => s.currency === currency)) {
      balanceMap.set(settlement.fromUser, (balanceMap.get(settlement.fromUser) ?? 0) + settlement.amount);
      balanceMap.set(settlement.toUser, (balanceMap.get(settlement.toUser) ?? 0) - settlement.amount);
    }

    const creditors: Array<{ id: string; amount: number }> = [];
    const debtors: Array<{ id: string; amount: number }> = [];

    for (const [userId, balance] of Array.from(balanceMap.entries())) {
      if (balance > 0.005) creditors.push({ id: userId, amount: balance });
      else if (balance < -0.005) debtors.push({ id: userId, amount: -balance });
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci];
      const debtor = debtors[di];
      const settleAmount = Math.min(creditor.amount, debtor.amount);

      if (settleAmount > 0.005) {
        allDebts.push({
          fromUserId: debtor.id,
          fromUserName: nameMap.get(debtor.id) ?? debtor.id,
          toUserId: creditor.id,
          toUserName: nameMap.get(creditor.id) ?? creditor.id,
          amount: Math.round(settleAmount * 100) / 100,
          currency,
        });
      }

      creditor.amount -= settleAmount;
      debtor.amount -= settleAmount;
      if (creditor.amount < 0.005) ci++;
      if (debtor.amount < 0.005) di++;
    }
  }

  return allDebts;
}
