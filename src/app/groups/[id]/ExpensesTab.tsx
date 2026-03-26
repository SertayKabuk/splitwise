"use client";

import { useState } from "react";
import { CURRENCIES, formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Expense, Balance } from "./types";
import { Avatar } from "./Avatar";

interface Props {
  groupId: string;
  expenses: Expense[];
  members: Member[];
  currentUserId: string;
  onRefresh: (expenses: Expense[], balances: Balance[]) => void;
}

export function ExpensesTab({ groupId, expenses, members, currentUserId, onRefresh }: Props) {
  const fmt = (amount: number, currency: string) => formatAmount(amount, currency as CurrencyCode);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Add expense modal
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState<CurrencyCode>("TRY");
  const [expensePaidBy, setExpensePaidBy] = useState(currentUserId);
  const [expenseSplitWith, setExpenseSplitWith] = useState<string[]>(members.map((m) => m.id));
  const [expenseSplitType, setExpenseSplitType] = useState<"equal" | "shares">("equal");
  const [expenseShares, setExpenseShares] = useState<Record<string, number>>(
    () => Object.fromEntries(members.map((m) => [m.id, 1]))
  );
  const [addExpenseLoading, setAddExpenseLoading] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState("");

  // Edit expense modal
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>("TRY");
  const [editPaidBy, setEditPaidBy] = useState(currentUserId);
  const [editSplitWith, setEditSplitWith] = useState<string[]>([]);
  const [editSplitType, setEditSplitType] = useState<"equal" | "shares">("equal");
  const [editShares, setEditShares] = useState<Record<string, number>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete / view modals
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

  const toggleSplitMember = (userId: string) => {
    if (expenseSplitWith.includes(userId)) {
      setExpenseSplitWith((prev) => prev.filter((id) => id !== userId));
    } else {
      setExpenseSplitWith((prev) => [...prev, userId]);
      setExpenseShares((prev) => ({ ...prev, [userId]: prev[userId] ?? 1 }));
    }
  };

  const refreshData = async () => {
    const [expensesRes, balancesRes] = await Promise.all([
      fetch(`/api/groups/${groupId}/expenses`),
      fetch(`/api/groups/${groupId}/balances`),
    ]);
    const newExpenses = expensesRes.ok ? await expensesRes.json() : expenses;
    const newBalances = balancesRes.ok ? await balancesRes.json() : [];
    onRefresh(newExpenses, newBalances);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim()) { setAddExpenseError("Title is required"); return; }
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) { setAddExpenseError("Enter a valid positive amount"); return; }
    if (expenseSplitWith.length === 0) { setAddExpenseError("Select at least one person to split with"); return; }

    setAddExpenseLoading(true);
    setAddExpenseError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expenseTitle.trim(),
          amount,
          currency: expenseCurrency,
          paidBy: expensePaidBy,
          splitType: expenseSplitType,
          splitWith: expenseSplitWith.map((userId) => ({ userId, shares: expenseShares[userId] ?? 1 })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add expense");
      }
      await refreshData();
      setShowAddExpense(false);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseCurrency("TRY");
      setExpensePaidBy(currentUserId);
      setExpenseSplitWith(members.map((m) => m.id));
      setExpenseSplitType("equal");
      setExpenseShares(Object.fromEntries(members.map((m) => [m.id, 1])));
    } catch (err) {
      setAddExpenseError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAddExpenseLoading(false);
    }
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditTitle(expense.title);
    setEditAmount(String(expense.amount));
    setEditCurrency(expense.currency as CurrencyCode);
    setEditPaidBy(expense.paid_by);
    setEditSplitWith(expense.splits.map((s) => s.user_id));
    setEditSplitType(expense.split_type as "equal" | "shares");
    setEditShares(Object.fromEntries(expense.splits.map((s) => [s.user_id, s.shares])));
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editTitle.trim()) { setEditError("Title is required"); return; }
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) { setEditError("Enter a valid positive amount"); return; }
    if (editSplitWith.length === 0) { setEditError("Select at least one person to split with"); return; }

    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          amount,
          currency: editCurrency,
          paidBy: editPaidBy,
          splitType: editSplitType,
          splitWith: editSplitWith.map((userId) => ({ userId, shares: editShares[userId] ?? 1 })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update expense");
      }
      await refreshData();
      setEditingExpense(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${deletingExpense.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete expense");
      }
      await refreshData();
      setDeletingExpense(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddExpense(true)}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium">No expenses yet</p>
          <p className="text-sm mt-1">Add the first expense for this group</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">{expense.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Paid by{" "}
                  <span className="font-medium text-slate-700">
                    {expense.paid_by === currentUserId ? "You" : expense.payer_name ?? expense.payer_email}
                  </span>
                </p>
                {expense.splits.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Split with:{" "}
                    {expense.splits
                      .map((s) => (s.user_id === currentUserId ? "You" : s.name ?? s.email))
                      .join(", ")}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(expense.created_at * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                <p className="text-lg font-bold text-emerald-600">{fmt(expense.amount, expense.currency)}</p>
                {(() => {
                  const mySplit = expense.splits.find((s) => s.user_id === currentUserId);
                  return mySplit ? (
                    <p className="text-xs text-slate-400">Your share: {fmt(mySplit.amount, expense.currency)}</p>
                  ) : null;
                })()}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setViewingExpense(expense)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="View details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  {expense.paid_by === currentUserId && (
                    <>
                      <button
                        onClick={() => openEdit(expense)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit expense"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingExpense(expense)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete expense"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddExpense(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Add Expense</h2>
              <button onClick={() => setShowAddExpense(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input type="text" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="e.g., Dinner at restaurant" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency <span className="text-red-500">*</span></label>
                <select value={expenseCurrency} onChange={(e) => setExpenseCurrency(e.target.value as CurrencyCode)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <option key={code} value={code}>{CURRENCIES[code].symbol} — {CURRENCIES[code].name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount ({CURRENCIES[expenseCurrency].symbol}) <span className="text-red-500">*</span></label>
                <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid by <span className="text-red-500">*</span></label>
                <select value={expensePaidBy} onChange={(e) => setExpensePaidBy(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.id === currentUserId ? "You" : m.name ?? m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Split with <span className="text-red-500">*</span></label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => setExpenseSplitType("equal")} className={`px-3 py-1.5 transition-colors ${expenseSplitType === "equal" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Equal</button>
                    <button type="button" onClick={() => setExpenseSplitType("shares")} className={`px-3 py-1.5 border-l border-slate-200 transition-colors ${expenseSplitType === "shares" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Shares</button>
                  </div>
                </div>
                <div className="space-y-1">
                  {members.map((m) => {
                    const isSelected = expenseSplitWith.includes(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSplitMember(m.id)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                        <Avatar member={m} size="sm" />
                        <span className="text-sm text-slate-700 flex-1">{m.id === currentUserId ? "You" : m.name ?? m.email}</span>
                        {expenseSplitType === "shares" && isSelected && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number" min={1} step={1} value={expenseShares[m.id] ?? 1}
                              onChange={(e) => setExpenseShares((prev) => ({ ...prev, [m.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                              className="w-14 text-center border border-slate-200 rounded-lg px-1.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-slate-400">shares</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {expenseSplitWith.length > 0 && expenseAmount && parseFloat(expenseAmount) > 0 && (() => {
                const totalAmount = parseFloat(expenseAmount);
                if (expenseSplitType === "equal") {
                  return (
                    <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                      Each person pays: <span className="font-semibold text-slate-700">{fmt(totalAmount / expenseSplitWith.length, expenseCurrency)}</span>
                    </p>
                  );
                }
                const totalShares = expenseSplitWith.reduce((sum, id) => sum + (expenseShares[id] ?? 1), 0);
                return (
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-1.5">
                    {expenseSplitWith.map((id) => {
                      const m = memberMap.get(id);
                      const myShares = expenseShares[id] ?? 1;
                      return (
                        <div key={id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">
                            {id === currentUserId ? "You" : m?.name ?? m?.email}
                            <span className="text-slate-400 ml-1">({myShares} share{myShares !== 1 ? "s" : ""})</span>
                          </span>
                          <span className="font-semibold text-slate-700">{fmt(totalAmount * myShares / totalShares, expenseCurrency)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {addExpenseError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{addExpenseError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addExpenseLoading} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">{addExpenseLoading ? "Adding..." : "Add Expense"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingExpense(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Edit Expense</h2>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency <span className="text-red-500">*</span></label>
                <select value={editCurrency} onChange={(e) => setEditCurrency(e.target.value as CurrencyCode)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <option key={code} value={code}>{CURRENCIES[code].symbol} — {CURRENCIES[code].name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount ({CURRENCIES[editCurrency].symbol}) <span className="text-red-500">*</span></label>
                <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} min="0.01" step="0.01" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid by <span className="text-red-500">*</span></label>
                <select value={editPaidBy} onChange={(e) => setEditPaidBy(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.id === currentUserId ? "You" : m.name ?? m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Split with <span className="text-red-500">*</span></label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => setEditSplitType("equal")} className={`px-3 py-1.5 transition-colors ${editSplitType === "equal" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Equal</button>
                    <button type="button" onClick={() => setEditSplitType("shares")} className={`px-3 py-1.5 border-l border-slate-200 transition-colors ${editSplitType === "shares" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Shares</button>
                  </div>
                </div>
                <div className="space-y-1">
                  {members.map((m) => {
                    const isSelected = editSplitWith.includes(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                        <input
                          type="checkbox" checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setEditSplitWith((prev) => prev.filter((id) => id !== m.id));
                            } else {
                              setEditSplitWith((prev) => [...prev, m.id]);
                              setEditShares((prev) => ({ ...prev, [m.id]: prev[m.id] ?? 1 }));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <Avatar member={m} size="sm" />
                        <span className="text-sm text-slate-700 flex-1">{m.id === currentUserId ? "You" : m.name ?? m.email}</span>
                        {editSplitType === "shares" && isSelected && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number" min={1} step={1} value={editShares[m.id] ?? 1}
                              onChange={(e) => setEditShares((prev) => ({ ...prev, [m.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                              className="w-14 text-center border border-slate-200 rounded-lg px-1.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-slate-400">shares</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {editSplitWith.length > 0 && editAmount && parseFloat(editAmount) > 0 && (() => {
                const totalAmount = parseFloat(editAmount);
                if (editSplitType === "equal") {
                  return (
                    <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                      Each person pays: <span className="font-semibold text-slate-700">{fmt(totalAmount / editSplitWith.length, editCurrency)}</span>
                    </p>
                  );
                }
                const totalShares = editSplitWith.reduce((sum, id) => sum + (editShares[id] ?? 1), 0);
                return (
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-1.5">
                    {editSplitWith.map((id) => {
                      const m = memberMap.get(id);
                      const myShares = editShares[id] ?? 1;
                      return (
                        <div key={id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">
                            {id === currentUserId ? "You" : m?.name ?? m?.email}
                            <span className="text-slate-400 ml-1">({myShares} share{myShares !== 1 ? "s" : ""})</span>
                          </span>
                          <span className="font-semibold text-slate-700">{fmt(totalAmount * myShares / totalShares, editCurrency)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {editError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingExpense(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">{editLoading ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingExpense(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Delete Expense</h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold">&ldquo;{deletingExpense.title}&rdquo;</span>?
              This will also update all balances.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingExpense(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">{deleteLoading ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Expense Details Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingExpense(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <button onClick={() => setViewingExpense(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 pr-6">{viewingExpense.title}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-bold text-emerald-600">{fmt(viewingExpense.amount, viewingExpense.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Paid by</span>
                <span className="text-sm font-medium text-slate-800">
                  {viewingExpense.paid_by === currentUserId ? "You" : viewingExpense.payer_name ?? viewingExpense.payer_email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Split type</span>
                <span className="text-sm font-medium text-slate-800 capitalize">{viewingExpense.split_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Date</span>
                <span className="text-sm text-slate-600">
                  {new Date(viewingExpense.created_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {viewingExpense.splits.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Split breakdown</p>
                  <div className="space-y-1.5">
                    {viewingExpense.splits.map((s) => (
                      <div key={s.user_id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">
                          {s.user_id === currentUserId ? "You" : s.name ?? s.email}
                          {viewingExpense.split_type === "shares" && (
                            <span className="text-slate-400 ml-1">({s.shares} share{s.shares !== 1 ? "s" : ""})</span>
                          )}
                        </span>
                        <span className="font-medium text-slate-800">{fmt(s.amount, viewingExpense.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingExpense.paid_by === currentUserId && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setViewingExpense(null); openEdit(viewingExpense); }}
                    className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setViewingExpense(null); setDeletingExpense(viewingExpense); }}
                    className="flex-1 px-3 py-2 border border-red-200 text-red-600 font-medium text-sm rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
