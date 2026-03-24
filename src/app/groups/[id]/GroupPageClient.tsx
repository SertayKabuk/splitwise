"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  joined_at: number;
}

interface ExpenseSplit {
  expense_id: string;
  user_id: string;
  amount: number;
  name: string | null;
  email: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  paid_by: string;
  created_at: number;
  payer_name: string | null;
  payer_email: string;
  splits: ExpenseSplit[];
}

interface Balance {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

interface Settlement {
  fromUser: string;
  toUser: string;
  amount: number;
  settledAt: number;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: number;
}

interface Props {
  group: Group;
  members: Member[];
  expenses: Expense[];
  balances: Balance[];
  settlements: Settlement[];
  currentUserId: string;
}

type Tab = "expenses" | "balances" | "members";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-teal-500",
];

function Avatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" | "lg" }) {
  const colorIndex =
    member.id.charCodeAt(0) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[colorIndex];
  const sizeClass = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-lg" : "w-9 h-9 text-sm";

  if (member.image) {
    const px = size === "sm" ? 28 : size === "lg" ? 48 : 36;
    return (
      <Image
        src={member.image}
        alt={member.name ?? member.email}
        width={px}
        height={px}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold`}>
      {getInitials(member.name, member.email)}
    </div>
  );
}

export default function GroupPageClient({
  group,
  members,
  expenses,
  balances: initialBalances,
  settlements,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [copied, setCopied] = useState(false);
  const [balances, setBalances] = useState<Balance[]>(initialBalances);
  const [expenseList, setExpenseList] = useState<Expense[]>(expenses);

  // Add expense modal
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState(currentUserId);
  const [expenseSplitWith, setExpenseSplitWith] = useState<string[]>(members.map((m) => m.id));
  const [addExpenseLoading, setAddExpenseLoading] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState("");

  // Edit expense modal
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaidBy, setEditPaidBy] = useState(currentUserId);
  const [editSplitWith, setEditSplitWith] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirmation
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Settle modal
  const [settleDebt, setSettleDebt] = useState<Balance | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/join/${group.invite_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleSplitMember = (userId: string) => {
    setExpenseSplitWith((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim()) {
      setAddExpenseError("Title is required");
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setAddExpenseError("Enter a valid positive amount");
      return;
    }
    if (expenseSplitWith.length === 0) {
      setAddExpenseError("Select at least one person to split with");
      return;
    }

    setAddExpenseLoading(true);
    setAddExpenseError("");

    try {
      const res = await fetch(`/api/groups/${group.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expenseTitle.trim(),
          amount,
          paidBy: expensePaidBy,
          splitWith: expenseSplitWith,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add expense");
      }

      // Refresh data
      const [expensesRes, balancesRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/expenses`),
        fetch(`/api/groups/${group.id}/balances`),
      ]);

      if (expensesRes.ok) setExpenseList(await expensesRes.json());
      if (balancesRes.ok) setBalances(await balancesRes.json());

      setShowAddExpense(false);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpensePaidBy(currentUserId);
      setExpenseSplitWith(members.map((m) => m.id));
    } catch (err) {
      setAddExpenseError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAddExpenseLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!settleDebt) return;
    setSettleLoading(true);

    try {
      const res = await fetch(`/api/groups/${group.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUser: settleDebt.fromUserId,
          toUser: settleDebt.toUserId,
          amount: settleDebt.amount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to record settlement");
      }

      // Refresh balances
      const balancesRes = await fetch(`/api/groups/${group.id}/balances`);
      if (balancesRes.ok) setBalances(await balancesRes.json());

      setSettleDebt(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSettleLoading(false);
    }
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditTitle(expense.title);
    setEditAmount(String(expense.amount));
    setEditPaidBy(expense.paid_by);
    setEditSplitWith(expense.splits.map((s) => s.user_id));
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
      const res = await fetch(`/api/groups/${group.id}/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), amount, paidBy: editPaidBy, splitWith: editSplitWith }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update expense");
      }
      const [expensesRes, balancesRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/expenses`),
        fetch(`/api/groups/${group.id}/balances`),
      ]);
      if (expensesRes.ok) setExpenseList(await expensesRes.json());
      if (balancesRes.ok) setBalances(await balancesRes.json());
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
      const res = await fetch(`/api/groups/${group.id}/expenses/${deletingExpense.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete expense");
      }
      const [expensesRes, balancesRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/expenses`),
        fetch(`/api/groups/${group.id}/balances`),
      ]);
      if (expensesRes.ok) setExpenseList(await expensesRes.json());
      if (balancesRes.ok) setBalances(await balancesRes.json());
      setDeletingExpense(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeleteLoading(false);
    }
  };

  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
          {group.description && (
            <p className="text-slate-500 mt-1">{group.description}</p>
          )}
          <p className="text-slate-400 text-sm mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleCopyInvite}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-medium rounded-lg transition-all text-sm"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Invite Link
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-1">
          {(["expenses", "balances", "members"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 font-medium text-sm capitalize rounded-t-lg transition-colors ${
                activeTab === tab
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
              {tab === "expenses" && expenseList.length > 0 && (
                <span className="ml-1.5 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                  {expenseList.length}
                </span>
              )}
              {tab === "balances" && balances.length > 0 && (
                <span className="ml-1.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                  {balances.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddExpense(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Expense
            </button>
          </div>

          {expenseList.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="font-medium">No expenses yet</p>
              <p className="text-sm mt-1">Add the first expense for this group</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenseList.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{expense.title}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Paid by{" "}
                      <span className="font-medium text-slate-700">
                        {expense.paid_by === currentUserId
                          ? "You"
                          : expense.payer_name ?? expense.payer_email}
                      </span>
                    </p>
                    {expense.splits.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Split with:{" "}
                        {expense.splits
                          .map((s) =>
                            s.user_id === currentUserId
                              ? "You"
                              : s.name ?? s.email
                          )
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
                    <p className="text-lg font-bold text-emerald-600">
                      ${expense.amount.toFixed(2)}
                    </p>
                    {expense.splits.length > 0 && (
                      <p className="text-xs text-slate-400">
                        ${(expense.amount / expense.splits.length).toFixed(2)} each
                      </p>
                    )}
                    <div className="flex gap-1.5">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Balances Tab */}
      {activeTab === "balances" && (
        <div>
          {balances.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-lg font-semibold text-slate-700">All settled up!</h3>
              <p className="text-slate-500 mt-1 text-sm">No outstanding debts in this group</p>
            </div>
          ) : (
            <div className="space-y-3">
              {balances.map((balance, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {memberMap.get(balance.fromUserId) && (
                        <Avatar member={memberMap.get(balance.fromUserId)!} size="sm" />
                      )}
                      <span className="font-medium text-slate-900 text-sm">
                        {balance.fromUserId === currentUserId ? "You" : balance.fromUserName}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <div className="flex items-center gap-2">
                      {memberMap.get(balance.toUserId) && (
                        <Avatar member={memberMap.get(balance.toUserId)!} size="sm" />
                      )}
                      <span className="font-medium text-slate-900 text-sm">
                        {balance.toUserId === currentUserId ? "You" : balance.toUserName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-500 text-lg">
                      ${balance.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setSettleDebt(balance)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm rounded-lg transition-colors"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4"
            >
              <Avatar member={member} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    {member.name ?? member.email}
                  </p>
                  {member.id === currentUserId && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                      You
                    </span>
                  )}
                  {member.id === group.created_by && (
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                      Creator
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{member.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Joined{" "}
                  {new Date(member.joined_at * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddExpense(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Add Expense</h2>
              <button
                onClick={() => setShowAddExpense(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g., Dinner at restaurant"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Amount ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Paid by <span className="text-red-500">*</span>
                </label>
                <select
                  value={expensePaidBy}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id === currentUserId ? "You" : m.name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Split with <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {members.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={expenseSplitWith.includes(m.id)}
                        onChange={() => toggleSplitMember(m.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <Avatar member={m} size="sm" />
                      <span className="text-sm text-slate-700">
                        {m.id === currentUserId ? "You" : m.name ?? m.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {expenseSplitWith.length > 0 && expenseAmount && parseFloat(expenseAmount) > 0 && (
                <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                  Each person pays:{" "}
                  <span className="font-semibold text-slate-700">
                    ${(parseFloat(expenseAmount) / expenseSplitWith.length).toFixed(2)}
                  </span>
                </p>
              )}

              {addExpenseError && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  {addExpenseError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExpenseLoading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {addExpenseLoading ? "Adding..." : "Add Expense"}
                </button>
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
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount ($) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid by <span className="text-red-500">*</span></label>
                <select
                  value={editPaidBy}
                  onChange={(e) => setEditPaidBy(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.id === currentUserId ? "You" : m.name ?? m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Split with <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editSplitWith.includes(m.id)}
                        onChange={() =>
                          setEditSplitWith((prev) =>
                            prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          )
                        }
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <Avatar member={m} size="sm" />
                      <span className="text-sm text-slate-700">{m.id === currentUserId ? "You" : m.name ?? m.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              {editSplitWith.length > 0 && editAmount && parseFloat(editAmount) > 0 && (
                <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                  Each person pays:{" "}
                  <span className="font-semibold text-slate-700">
                    ${(parseFloat(editAmount) / editSplitWith.length).toFixed(2)}
                  </span>
                </p>
              )}
              {editError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingExpense(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
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
              <button onClick={() => setDeletingExpense(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Confirmation Modal */}
      {settleDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSettleDebt(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Confirm Settlement</h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to record that{" "}
              <span className="font-semibold">
                {settleDebt.fromUserId === currentUserId ? "You" : settleDebt.fromUserName}
              </span>{" "}
              paid{" "}
              <span className="font-semibold text-emerald-600">
                ${settleDebt.amount.toFixed(2)}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {settleDebt.toUserId === currentUserId ? "You" : settleDebt.toUserName}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSettleDebt(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                disabled={settleLoading}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {settleLoading ? "Settling..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
