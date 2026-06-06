"use client";

import { useState } from "react";
import { CURRENCIES, formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Expense, Balance, Attachment } from "./types";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  ClipboardList,
  FileText,
  X,
  FileUp,
  Paperclip,
} from "lucide-react";

interface Props {
  groupId: string;
  expenses: Expense[];
  members: Member[];
  currentUserId: string;
  onRefresh: (expenses: Expense[], balances: Balance[]) => void;
}

interface SplitMemberListProps {
  members: Member[];
  currentUserId: string;
  splitWith: string[];
  splitType: "equal" | "shares";
  shares: Record<string, number>;
  onToggle: (id: string) => void;
  onShareChange: (id: string, val: number) => void;
}

function SplitMemberList({
  members,
  currentUserId,
  splitWith,
  splitType,
  shares,
  onToggle,
  onShareChange,
}: SplitMemberListProps) {
  return (
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
            <span className="text-sm text-foreground flex-1">
              {m.id === currentUserId ? "You" : m.name ?? m.email}
            </span>
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
}

interface SplitPreviewProps {
  splitWith: string[];
  splitType: "equal" | "shares";
  shares: Record<string, number>;
  amount: string;
  currency: CurrencyCode;
  memberMap: Map<string, Member>;
  currentUserId: string;
  fmt: (amount: number, currency: string) => string;
}

function SplitPreview({
  splitWith,
  splitType,
  shares,
  amount,
  currency,
  memberMap,
  currentUserId,
  fmt,
}: SplitPreviewProps) {
  const totalAmount = parseFloat(amount);
  if (splitWith.length === 0 || !amount || isNaN(totalAmount) || totalAmount <= 0) return null;

  if (splitType === "equal") {
    return (
      <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
        Each person pays:{" "}
        <span className="font-semibold text-foreground">
          {fmt(totalAmount / splitWith.length, currency)}
        </span>
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
              <span className="text-muted-foreground/60 ml-1">
                ({myShares} share{myShares !== 1 ? "s" : ""})
              </span>
            </span>
            <span className="font-semibold text-foreground">
              {fmt((totalAmount * myShares) / totalShares, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface FileUploadAreaProps {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
}

function FileUploadArea({ files, onChange, label = "Attachments (PDF or Image)" }: FileUploadAreaProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onChange([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="border border-dashed border-border hover:border-primary/50 rounded-xl p-4 transition-colors bg-accent/20 cursor-pointer relative group flex flex-col items-center justify-center gap-1.5 text-center min-h-[90px]">
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <FileUp className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        <div className="text-xs text-muted-foreground">
          <span className="text-primary font-semibold">Click to upload</span> or drag and drop
          <p className="text-[10px] mt-0.5 text-muted-foreground/60">Images or PDFs (max 10MB)</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {files.map((file, idx) => {
            const isImage = file.type.startsWith("image/");
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-card text-xs"
              >
                {isImage ? (
                  <div className="w-8 h-8 rounded bg-muted flex-shrink-0 overflow-hidden relative border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeFile(idx)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [expenseShares, setExpenseShares] = useState<Record<string, number>>(() =>
    Object.fromEntries(members.map((m) => [m.id, 1]))
  );
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseFiles, setExpenseFiles] = useState<File[]>([]);
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
  const [editNotes, setEditNotes] = useState("");
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState<string[]>([]);
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
      const formData = new FormData();
      formData.append("title", expenseTitle.trim());
      formData.append("amount", amount.toString());
      formData.append("currency", expenseCurrency);
      formData.append("paidBy", expensePaidBy);
      formData.append("splitType", expenseSplitType);
      formData.append(
        "splitWith",
        JSON.stringify(
          expenseSplitWith.map((userId) => ({ userId, shares: expenseShares[userId] ?? 1 }))
        )
      );
      if (expenseNotes.trim()) {
        formData.append("notes", expenseNotes.trim());
      }
      expenseFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        body: formData,
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
      setExpenseNotes("");
      setExpenseFiles([]);
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
    setEditNotes(expense.notes || "");
    setExistingAttachments(expense.attachments || []);
    setRemoveAttachmentIds([]);
    setEditFiles([]);
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editTitle.trim()) {
      setEditError("Title is required");
      return;
    }
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      setEditError("Enter a valid positive amount");
      return;
    }
    if (editSplitWith.length === 0) {
      setEditError("Select at least one person to split with");
      return;
    }

    setEditLoading(true);
    setEditError("");
    try {
      const formData = new FormData();
      formData.append("title", editTitle.trim());
      formData.append("amount", amount.toString());
      formData.append("currency", editCurrency);
      formData.append("paidBy", editPaidBy);
      formData.append("splitType", editSplitType);
      formData.append(
        "splitWith",
        JSON.stringify(
          editSplitWith.map((userId) => ({ userId, shares: editShares[userId] ?? 1 }))
        )
      );
      formData.append("notes", editNotes.trim());
      formData.append("removeAttachmentIds", JSON.stringify(removeAttachmentIds));
      editFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/groups/${groupId}/expenses/${editingExpense.id}`, {
        method: "PUT",
        body: formData,
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
      const res = await fetch(`/api/groups/${groupId}/expenses/${deletingExpense.id}`, {
        method: "DELETE",
      });
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
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  {expense.title}
                  {(expense.attachments?.length ?? 0) > 0 && (
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Paid by{" "}
                  <span className="font-medium text-foreground">
                    {expense.paid_by === currentUserId
                      ? "You"
                      : expense.payer_name ?? expense.payer_email}
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
                <p className="text-lg font-bold text-emerald-500">
                  {fmt(expense.amount, expense.currency)}
                </p>
                {(() => {
                  const mySplit = expense.splits.find((s) => s.user_id === currentUserId);
                  return mySplit ? (
                    <p className="text-xs text-muted-foreground">
                      Your share: {fmt(mySplit.amount, expense.currency)}
                    </p>
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
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="e.g., Dinner at restaurant"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select
                value={expenseCurrency}
                onValueChange={(v) => setExpenseCurrency(v as CurrencyCode)}
              >
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
              <Label>
                Amount ({CURRENCIES[expenseCurrency].symbol}){" "}
                <span className="text-destructive">*</span>
              </Label>
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
              <Label>
                Paid by <span className="text-destructive">*</span>
              </Label>
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
                <Label>
                  Split with <span className="text-destructive">*</span>
                </Label>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setExpenseSplitType("equal")}
                    className={`px-3 py-1.5 transition-colors ${
                      expenseSplitType === "equal"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseSplitType("shares")}
                    className={`px-3 py-1.5 border-l border-border transition-colors ${
                      expenseSplitType === "shares"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Shares
                  </button>
                </div>
              </div>
              <SplitMemberList
                members={members}
                currentUserId={currentUserId}
                splitWith={expenseSplitWith}
                splitType={expenseSplitType}
                shares={expenseShares}
                onToggle={toggleSplitMember}
                onShareChange={(id, val) =>
                  setExpenseShares((prev) => ({ ...prev, [id]: val }))
                }
              />
            </div>
            <SplitPreview
              splitWith={expenseSplitWith}
              splitType={expenseSplitType}
              shares={expenseShares}
              amount={expenseAmount}
              currency={expenseCurrency}
              memberMap={memberMap}
              currentUserId={currentUserId}
              fmt={fmt}
            />

            <div className="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                placeholder="Add receipt details, notes, or descriptions..."
                rows={3}
                className="resize-none"
              />
            </div>

            <FileUploadArea files={expenseFiles} onChange={setExpenseFiles} />

            {addExpenseError && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                {addExpenseError}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddExpense(false)}
                className="flex-1"
              >
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
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Currency <span className="text-destructive">*</span>
              </Label>
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
              <Label>
                Amount ({CURRENCIES[editCurrency].symbol}){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Paid by <span className="text-destructive">*</span>
              </Label>
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
                <Label>
                  Split with <span className="text-destructive">*</span>
                </Label>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setEditSplitType("equal")}
                    className={`px-3 py-1.5 transition-colors ${
                      editSplitType === "equal"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSplitType("shares")}
                    className={`px-3 py-1.5 border-l border-border transition-colors ${
                      editSplitType === "shares"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Shares
                  </button>
                </div>
              </div>
              <SplitMemberList
                members={members}
                currentUserId={currentUserId}
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
              memberMap={memberMap}
              currentUserId={currentUserId}
              fmt={fmt}
            />

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add receipt details, notes, or descriptions..."
                rows={3}
                className="resize-none"
              />
            </div>

            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Existing Attachments</Label>
                <div className="space-y-1.5">
                  {existingAttachments.map((att) => {
                    const isRemoved = removeAttachmentIds.includes(att.id);
                    const isImage = att.mime_type.startsWith("image/");
                    const fileUrl = `/api/groups/${groupId}/attachments/${att.id}`;
                    return (
                      <div
                        key={att.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border border-border text-xs transition-all ${
                          isRemoved ? "opacity-40 bg-destructive/5 line-through" : "bg-card"
                        }`}
                      >
                        {isImage ? (
                          <div className="w-8 h-8 rounded bg-muted flex-shrink-0 overflow-hidden relative border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileUrl}
                              alt={att.original_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium truncate" title={att.original_name}>
                            {att.original_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (isRemoved) {
                              setRemoveAttachmentIds(removeAttachmentIds.filter((id) => id !== att.id));
                            } else {
                              setRemoveAttachmentIds([...removeAttachmentIds, att.id]);
                            }
                          }}
                        >
                          {isRemoved ? <Plus className="w-3.5 h-3.5 text-primary" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <FileUploadArea
              files={editFiles}
              onChange={setEditFiles}
              label="Upload More Attachments"
            />

            {editError && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                {editError}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingExpense(null)}
                className="flex-1"
              >
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
              <span className="font-semibold text-foreground">
                &ldquo;{deletingExpense?.title}&rdquo;
              </span>
              ? This will also update all balances.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeletingExpense(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Expense Details Modal */}
      <Dialog open={!!viewingExpense} onOpenChange={(open) => !open && setViewingExpense(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6">{viewingExpense?.title}</DialogTitle>
          </DialogHeader>
          {viewingExpense && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-emerald-500">
                  {fmt(viewingExpense.amount, viewingExpense.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid by</span>
                <span className="text-sm font-medium text-foreground">
                  {viewingExpense.paid_by === currentUserId
                    ? "You"
                    : viewingExpense.payer_name ?? viewingExpense.payer_email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Split type</span>
                <span className="text-sm font-medium text-foreground capitalize">
                  {viewingExpense.split_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm text-foreground">
                  {new Date(viewingExpense.created_at * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {viewingExpense.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Notes
                    </p>
                    <p className="text-sm text-foreground bg-accent/30 p-2.5 rounded-xl border border-border italic whitespace-pre-wrap">
                      {viewingExpense.notes}
                    </p>
                  </div>
                </>
              )}

              {viewingExpense.attachments && viewingExpense.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Attachments
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {viewingExpense.attachments.map((att) => {
                        const isImage = att.mime_type.startsWith("image/");
                        const fileUrl = `/api/groups/${groupId}/attachments/${att.id}`;
                        return (
                          <a
                            key={att.id}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-card hover:bg-accent/40 hover:border-accent-foreground/20 transition-all text-xs font-medium truncate group"
                          >
                            {isImage ? (
                              <div className="w-8 h-8 rounded bg-muted flex-shrink-0 overflow-hidden relative border border-border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={fileUrl}
                                  alt={att.original_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground truncate" title={att.original_name}>
                                {att.original_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(att.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {viewingExpense.splits.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Split breakdown
                    </p>
                    <div className="space-y-1.5">
                      {viewingExpense.splits.map((s) => (
                        <div key={s.user_id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            {s.user_id === currentUserId ? "You" : s.name ?? s.email}
                            {viewingExpense.split_type === "shares" && (
                              <span className="text-muted-foreground ml-1 font-normal">
                                ({s.shares} share{s.shares !== 1 ? "s" : ""})
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-foreground">
                            {fmt(s.amount, viewingExpense.currency)}
                          </span>
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
                    onClick={() => {
                      setViewingExpense(null);
                      openEdit(viewingExpense);
                    }}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setViewingExpense(null);
                      setDeletingExpense(viewingExpense);
                    }}
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
