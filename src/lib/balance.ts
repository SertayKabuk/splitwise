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
  splits: ExpenseSplit[];
}

export interface Settlement {
  fromUser: string;
  toUser: string;
  amount: number;
}

export interface Debt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export function calculateBalances(
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[]
): Debt[] {
  // Build a net balance map: positive means user is owed money, negative means user owes money
  const balanceMap: Map<string, number> = new Map();

  for (const member of members) {
    balanceMap.set(member.id, 0);
  }

  // Process expenses
  for (const expense of expenses) {
    // The payer gets credit for the full amount
    const currentPayer = balanceMap.get(expense.paidBy) ?? 0;
    balanceMap.set(expense.paidBy, currentPayer + expense.amount);

    // Each split participant owes their share
    for (const split of expense.splits) {
      const current = balanceMap.get(split.userId) ?? 0;
      balanceMap.set(split.userId, current - split.amount);
    }
  }

  // Apply settlements
  for (const settlement of settlements) {
    const fromCurrent = balanceMap.get(settlement.fromUser) ?? 0;
    balanceMap.set(settlement.fromUser, fromCurrent + settlement.amount);

    const toCurrent = balanceMap.get(settlement.toUser) ?? 0;
    balanceMap.set(settlement.toUser, toCurrent - settlement.amount);
  }

  // Build a name lookup
  const nameMap: Map<string, string> = new Map();
  for (const member of members) {
    nameMap.set(member.id, member.name ?? member.email);
  }

  // Simplify debts with greedy two-pointer algorithm
  const debts: Debt[] = [];

  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [userId, balance] of Array.from(balanceMap.entries())) {
    if (balance > 0.005) {
      creditors.push({ id: userId, amount: balance });
    } else if (balance < -0.005) {
      debtors.push({ id: userId, amount: -balance });
    }
  }

  // Sort descending for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const settleAmount = Math.min(creditor.amount, debtor.amount);

    if (settleAmount > 0.005) {
      debts.push({
        fromUserId: debtor.id,
        fromUserName: nameMap.get(debtor.id) ?? debtor.id,
        toUserId: creditor.id,
        toUserName: nameMap.get(creditor.id) ?? creditor.id,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    creditor.amount -= settleAmount;
    debtor.amount -= settleAmount;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount < 0.005) di++;
  }

  return debts;
}
