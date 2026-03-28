"use client";

import { useState } from "react";
import { CURRENCIES, formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Expense, Balance } from "./types";
import { Avatar } from "./Avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Eye, Pencil, Trash2, ClipboardList } from "lucide-react";

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

  const SplitMemberList = ({
    splitWith,
    splitType,
    shares,
    onToggle,
    onShareChange,
  }: {
    splitWith: string[];
    splitType: "equal" | "shares";
    shares: Record<string, number>;
    onToggle: (id: string) => void;
    onShareChange: (id: string, val: number) => void;
  }) => (
    <div className="space-y-1">
      {members.map((m) => {
        const isSelected = splitWith.includes(m.id);
        return (
          <div
            key={m.id}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => onToggle(m.id)}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(m.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 accent-primary rounded border-border"
            />
            <Avatar member={m} size="sm" />
            <span className="text-sm text-foreground flex-1">{m.id === currentUserId ? "You" : m.name ?? m.email}</span>
            {splitType === "shares" && isSelected && (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={shares[m.id] ?? 1}
                  onChange={(e) => onShareChange(m.id, Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-center h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">shares</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const SplitPreview = ({
    splitWith,
    splitType,
    shares,
    amount,
    currency,
  }: {
    splitWith: string[];
    splitType: "equal" | "shares";
    shares: Record<string, number>;
    amount: string;
    currency: CurrencyCode;
  }) => {
    const totalAmount = parseFloat(amount);
    if (splitWith.length === 0 || !amount || isNaN(totalAmount) || totalAmount <= 0) return null;

    if (splitType === "equal") {
      return (
        <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
          Each person pays: <span className="font-semibold text-foreground">{fmt(totalAmount / splitWith.length, currency)}</span>
        </p>
      );
    }

    const totalShares = splitWith.reduce((sum, id) => sum + (shares[id] ?? 1), 0);
    return (
      <div className="bg-muted rounded-lg px-3 py-2.5 space-y-1.5">
        {splitWith.map((id) => {
          const m = memberMap.get(id);
          const myShares = shares[id] ?? 1;
          return (
            <div key={id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {id === currentUserId ? "You" : m?.name ?? m?.email}
                <span className="text-muted-foreground/60 ml-1">({myShares} share{myShares !== 1 ? "s" : ""})</span>
              </span>
              <span className="font-semibold text-foreground">{fmt(totalAmount * myShares / totalShares, currency)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowAddExpense(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium">No expenses yet</p>
          <p className="text-sm mt-1">Add the first expense for this group</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{expense.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Paid by{" "}
                  <span className="font-medium text-foreground">
                    {expense.paid_by === currentUserId ? "You" : expense.payer_name ?? expense.payer_email}
                  </span>
                </p>
                {expense.splits.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Split with:{" "}
                    {expense.splits
                      .map((s) => (s.user_id === currentUserId ? "You" : s.name ?? s.email))
                      .join(", ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(expense.created_at * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                <p className="text-lg font-bold text-emerald-500">{fmt(expense.amount, expense.currency)}</p>
                {(() => {
                  const mySplit = expense.splits.find((s) => s.user_id === currentUserId);
                  return mySplit ? (
                    <p className="text-xs text-muted-foreground">Your share: {fmt(mySplit.amount, expense.currency)}</p>
                  ) : null;
                })()}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => setViewingExpense(expense)}
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  {expense.paid_by === currentUserId && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => openEdit(expense)}
                        title="Edit expense"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingExpense(expense)}
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="e.g., Dinner at restaurant"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency <span className="text-destructive">*</span></Label>
              <Select value={expenseCurrency} onValueChange={(v) => setExpenseCurrency(v as CurrencyCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <SelectItem key={code} value={code}>
                      {CURRENCIES[code].symbol} — {CURRENCIES[code].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount ({CURRENCIES[expenseCurrency].symbol}) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paid by <span className="text-destructive">*</span></Label>
              <Select value={expensePaidBy} onValueChange={setExpensePaidBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.id === currentUserId ? "You" : m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Split with <span className="text-destructive">*</span></Label>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setExpenseSplitType("equal")}
                    className={`px-3 py-1.5 transition-colors ${expenseSplitType === "equal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseSplitType("shares")}
                    className={`px-3 py-1.5 border-l border-border transition-colors ${expenseSplitType === "shares" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    Shares
                  </button>
                </div>
              </div>
              <SplitMemberList
                splitWith={expenseSplitWith}
                splitType={expenseSplitType}
                shares={expenseShares}
                onToggle={toggleSplitMember}
                onShareChange={(id, val) => setExpenseShares((prev) => ({ ...prev, [id]: val }))}
              />
            </div>
            <SplitPreview
              splitWith={expenseSplitWith}
              splitType={expenseSplitType}
              shares={expenseShares}
              amount={expenseAmount}
              currency={expenseCurrency}
            />
            {addExpenseError && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{addExpenseError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={addExpenseLoading} className="flex-1">
                {addExpenseLoading ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency <span className="text-destructive">*</span></Label>
              <Select value={editCurrency} onValueChange={(v) => setEditCurrency(v as CurrencyCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <SelectItem key={code} value={code}>
                      {CURRENCIES[code].symbol} — {CURRENCIES[code].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount ({CURRENCIES[editCurrency].symbol}) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paid by <span className="text-destructive">*</span></Label>
              <Select value={editPaidBy} onValueChange={setEditPaidBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.id === currentUserId ? "You" : m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Split with <span className="text-destructive">*</span></Label>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setEditSplitType("equal")}
                    className={`px-3 py-1.5 transition-colors ${editSplitType === "equal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSplitType("shares")}
                    className={`px-3 py-1.5 border-l border-border transition-colors ${editSplitType === "shares" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    Shares
                  </button>
                </div>
              </div>
              <SplitMemberList
                splitWith={editSplitWith}
                splitType={editSplitType}
                shares={editShares}
                onToggle={(id) => {
                  if (editSplitWith.includes(id)) {
                    setEditSplitWith((prev) => prev.filter((x) => x !== id));
                  } else {
                    setEditSplitWith((prev) => [...prev, id]);
                    setEditShares((prev) => ({ ...prev, [id]: prev[id] ?? 1 }));
                  }
                }}
                onShareChange={(id, val) => setEditShares((prev) => ({ ...prev, [id]: val }))}
              />
            </div>
            <SplitPreview
              splitWith={editSplitWith}
              splitType={editSplitType}
              shares={editShares}
              amount={editAmount}
              currency={editCurrency}
            />
            {editError && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{editError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingExpense(null)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading} className="flex-1">
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">&ldquo;{deletingExpense?.title}&rdquo;</span>?
              This will also update all balances.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeletingExpense(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading} className="flex-1">
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Expense Details Modal */}
      <Dialog open={!!viewingExpense} onOpenChange={(open) => !open && setViewingExpense(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="pr-6">{viewingExpense?.title}</DialogTitle>
          </DialogHeader>
          {viewingExpense && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-emerald-500">{fmt(viewingExpense.amount, viewingExpense.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid by</span>
                <span className="text-sm font-medium text-foreground">
                  {viewingExpense.paid_by === currentUserId ? "You" : viewingExpense.payer_name ?? viewingExpense.payer_email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Split type</span>
                <span className="text-sm font-medium text-foreground capitalize">{viewingExpense.split_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm text-foreground">
                  {new Date(viewingExpense.created_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {viewingExpense.splits.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Split breakdown</p>
                    <div className="space-y-1.5">
                      {viewingExpense.splits.map((s) => (
                        <div key={s.user_id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            {s.user_id === currentUserId ? "You" : s.name ?? s.email}
                            {viewingExpense.split_type === "shares" && (
                              <span className="text-muted-foreground ml-1">({s.shares} share{s.shares !== 1 ? "s" : ""})</span>
                            )}
                          </span>
                          <span className="font-medium text-foreground">{fmt(s.amount, viewingExpense.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {viewingExpense.paid_by === currentUserId && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setViewingExpense(null); openEdit(viewingExpense); }}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { setViewingExpense(null); setDeletingExpense(viewingExpense); }}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
