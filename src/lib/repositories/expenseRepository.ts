import getDb from "@/lib/db";
import { randomUUID } from "crypto";

export interface DbExpense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_type: string;
  created_at: number;
}

export interface ExpenseWithPayer extends DbExpense {
  payer_name: string | null;
  payer_email: string;
}

export interface DbExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  shares: number;
}

export interface ExpenseSplitWithUser extends DbExpenseSplit {
  name: string | null;
  email: string;
}

export function getExpensesByGroupId(groupId: string): ExpenseWithPayer[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        e.id,
        e.group_id,
        e.title,
        e.amount,
        e.currency,
        e.paid_by,
        e.split_type,
        e.created_at,
        u.name as payer_name,
        u.email as payer_email
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = ?
      ORDER BY e.created_at DESC
      `
    )
    .all(groupId) as ExpenseWithPayer[];
}

export function getExpenseSplitsByGroupId(groupId: string): ExpenseSplitWithUser[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        es.id,
        es.expense_id,
        es.user_id,
        es.amount,
        es.shares,
        u.name,
        u.email
      FROM expense_splits es
      JOIN users u ON es.user_id = u.id
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ?
      `
    )
    .all(groupId) as ExpenseSplitWithUser[];
}

export function getExpensesByUserGroups(
  userId: string
): Array<{ id: string; group_id: string; paid_by: string; amount: number; currency: string }> {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT id, group_id, paid_by, amount, currency
      FROM expenses
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
      `
    )
    .all(userId) as Array<{
    id: string;
    group_id: string;
    paid_by: string;
    amount: number;
    currency: string;
  }>;
}

export function getExpenseSplitsByUserGroups(
  userId: string
): Array<{ user_id: string; amount: number; group_id: string; currency: string }> {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT es.user_id, es.amount, e.group_id, e.currency
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
      `
    )
    .all(userId) as Array<{
    user_id: string;
    amount: number;
    group_id: string;
    currency: string;
  }>;
}

export function getExpenseById(expenseId: string): DbExpense | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, group_id, title, amount, currency, paid_by, split_type, created_at FROM expenses WHERE id = ?")
    .get(expenseId) as DbExpense | undefined;
}

export function getExpenseByIdAndGroupId(
  expenseId: string,
  groupId: string
): { id: string; paid_by: string } | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, paid_by FROM expenses WHERE id = ? AND group_id = ?")
    .get(expenseId, groupId) as { id: string; paid_by: string } | undefined;
}

export function createExpense(
  expense: {
    id: string;
    group_id: string;
    title: string;
    amount: number;
    currency: string;
    paid_by: string;
    split_type: string;
  },
  splits: Array<{ user_id: string; amount: number; shares: number }>
): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      "INSERT INTO expenses (id, group_id, title, amount, currency, paid_by, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      expense.id,
      expense.group_id,
      expense.title,
      expense.amount,
      expense.currency,
      expense.paid_by,
      expense.split_type
    );

    const insertSplit = db.prepare(
      "INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)"
    );
    for (const split of splits) {
      insertSplit.run(randomUUID(), expense.id, split.user_id, split.amount, split.shares);
    }
  })();
}

export function updateExpense(
  expenseId: string,
  expense: {
    title: string;
    amount: number;
    currency: string;
    paid_by: string;
    split_type: string;
  },
  splits: Array<{ user_id: string; amount: number; shares: number }>
): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      "UPDATE expenses SET title = ?, amount = ?, currency = ?, paid_by = ?, split_type = ? WHERE id = ?"
    ).run(
      expense.title,
      expense.amount,
      expense.currency,
      expense.paid_by,
      expense.split_type,
      expenseId
    );

    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(expenseId);

    const insertSplit = db.prepare(
      "INSERT INTO expense_splits (id, expense_id, user_id, amount, shares) VALUES (?, ?, ?, ?, ?)"
    );
    for (const split of splits) {
      insertSplit.run(randomUUID(), expenseId, split.user_id, split.amount, split.shares);
    }
  })();
}

export function deleteExpense(expenseId: string): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(expenseId);
    db.prepare("DELETE FROM expenses WHERE id = ?").run(expenseId);
  })();
}
