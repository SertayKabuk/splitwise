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
  Scale,
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
    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
      {members.map((m) => {
        const isSelected = splitWith.includes(m.id);
        return (
          <div
            key={m.id}
            className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
              isSelected
                ? "bg-primary/5 border-primary/30 shadow-sm"
                : "bg-card border-border/60 hover:bg-muted/40 hover:border-border"
            }`}
            onClick={() => onToggle(m.id)}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(m.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 accent-primary rounded-md border-border cursor-pointer"
            />
            <Avatar member={m} size="sm" />
            <span className={`text-sm flex-1 truncate ${isSelected ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {m.id === currentUserId ? "You" : m.name ?? m.email}
            </span>
            {splitType === "shares" && isSelected && (
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={shares[m.id] ?? 1}
                  onChange={(e) => onShareChange(m.id, Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-center h-8 text-xs font-bold bg-background border-border/80 rounded-lg"
                />
                <span className="text-[11px] font-bold text-muted-foreground">shares</span>
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

  // Group expenses by Month & Year (sorted reverse chronologically by created_at)
  const groupExpensesByMonth = (expensesList: Expense[]) => {
    const groups: { monthYear: string; items: Expense[] }[] = [];
    
    // Sort reverse chronologically
    const sorted = [...expensesList].sort((a, b) => b.created_at - a.created_at);
    
    sorted.forEach((expense) => {
      const date = new Date(expense.created_at * 1000);
      const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      
      let group = groups.find((g) => g.monthYear === key);
      if (!group) {
        group = { monthYear: key, items: [] };
        groups.push(group);
      }
      group.items.push(expense);
    });
    
    return groups;
  };

  const expenseGroups = groupExpensesByMonth(expenses);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowAddExpense(true)} className="gap-2 w-full sm:w-auto shadow-sm bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-primary-foreground font-semibold rounded-xl">
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-3xl p-8 max-w-md mx-auto">
          <ClipboardList className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-extrabold text-foreground text-lg">No expenses yet</p>
          <p className="text-sm mt-1.5 text-muted-foreground max-w-[280px] mx-auto">Add the first expense to start splitting costs with the group</p>
          <Button onClick={() => setShowAddExpense(true)} className="mt-5 gap-2 font-semibold rounded-xl">
            <Plus className="w-4 h-4" />
            Add First Expense
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {expenseGroups.map((group) => (
            <div key={group.monthYear} className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-3 px-1.5">
                <span className="bg-muted/60 dark:bg-muted/20 border border-border/40 px-3 py-1 rounded-full text-[10px] font-extrabold text-muted-foreground">
                  {group.monthYear}
                </span>
                <span className="flex-1 h-px bg-border/40"></span>
              </h3>
              
              <div className="space-y-3.5">
                {group.items.map((expense) => {
                  const date = new Date(expense.created_at * 1000);
                  const monthShort = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
                  
                  const payer = memberMap.get(expense.paid_by);
                  const mySplit = expense.splits.find((s) => s.user_id === currentUserId);
                  const totalAmount = expense.amount;
                  const isPayer = expense.paid_by === currentUserId;

                  // Balance outcome details
                  let balanceText = "";
                  let balanceAmount = 0;
                  let balanceColorClass = ""; // For style classes
                  let isSelfPaid = false;
                  let isNotInvolved = false;

                  if (isPayer) {
                    const mySplitAmount = mySplit ? mySplit.amount : 0;
                    const lentAmount = totalAmount - mySplitAmount;
                    if (lentAmount > 0) {
                      balanceText = "You lent";
                      balanceAmount = lentAmount;
                      balanceColorClass = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/25";
                    } else {
                      isSelfPaid = true;
                      balanceText = "Self-expense";
                      balanceColorClass = "text-muted-foreground bg-muted/50 border-border/40";
                    }
                  } else {
                    if (mySplit) {
                      balanceText = "You owe";
                      balanceAmount = mySplit.amount;
                      balanceColorClass = "text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/25";
                    } else {
                      isNotInvolved = true;
                      balanceText = "Not involved";
                      balanceColorClass = "text-muted-foreground bg-muted/50 border-border/40";
                    }
                  }

                  return (
                    <div
                      key={expense.id}
                      onClick={() => setViewingExpense(expense)}
                      className="bg-card rounded-2xl border border-border/70 hover:border-primary/30 hover:shadow-md active:scale-[0.99] cursor-pointer p-4 flex items-center justify-between gap-4 transition-all duration-300 group/card relative overflow-hidden"
                    >
                      {/* Left: Date & Core Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Calendar block date badge */}
                        <div className="flex flex-col items-center justify-center bg-muted/40 text-muted-foreground w-12 h-14 rounded-xl border border-border/60 shadow-sm shrink-0 transition-colors group-hover/card:bg-muted/60">
                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase leading-none">{monthShort}</span>
                          <span className="text-lg font-extrabold text-foreground leading-none mt-1">{day}</span>
                        </div>

                        {/* Text info */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-foreground text-sm sm:text-base tracking-tight truncate group-hover/card:text-primary transition-colors pr-2">
                            {expense.title}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {/* Payer Pill */}
                            <div className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/60 px-2 py-0.5 rounded-full border border-border/40 transition-colors shrink-0 max-w-[140px] truncate">
                              {payer && <Avatar member={payer} size="sm" />}
                              <span className="text-[10px] font-semibold text-foreground truncate">
                                {isPayer ? "You" : payer?.name ?? payer?.email}
                              </span>
                            </div>
                            
                            {/* Split Type Badge if shares */}
                            {expense.split_type === "shares" && (
                              <span className="text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md">
                                Shares
                              </span>
                            )}

                            {/* Attachments indicator */}
                            {(expense.attachments?.length ?? 0) > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-md">
                                <Paperclip className="w-2.5 h-2.5" />
                                {expense.attachments.length}
                              </span>
                            )}

                            {/* Notes indicator */}
                            {expense.notes && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md max-w-[100px] truncate" title={expense.notes}>
                                <FileText className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{expense.notes}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Splits Avatar Stack (hidden on tiny screens, flex on desktop) */}
                      {expense.splits.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0 px-2">
                          <div className="flex -space-x-2 overflow-hidden">
                            {expense.splits.slice(0, 4).map((s) => {
                              const m = memberMap.get(s.user_id);
                              if (!m) return null;
                              return (
                                <div
                                  key={s.user_id}
                                  className="inline-block rounded-full ring-2 ring-card overflow-hidden shrink-0"
                                  title={s.user_id === currentUserId ? "You" : m.name ?? m.email}
                                >
                                  <Avatar member={m} size="sm" />
                                </div>
                              );
                            })}
                            {expense.splits.length > 4 && (
                              <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground ring-2 ring-card shrink-0">
                                +{expense.splits.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Right: Amounts and Actions */}
                      <div className="text-right shrink-0 flex items-center gap-2.5">
                        <div className="flex flex-col items-end justify-center min-w-[95px]">
                          {/* Paid by label & amount */}
                          <div className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                            {isPayer ? "You paid" : `${payer?.name?.split(" ")[0] ?? payer?.email.split("@")[0]} paid`}
                          </div>
                          <div className="text-base font-extrabold text-foreground leading-none">
                            {fmt(totalAmount, expense.currency)}
                          </div>

                          {/* Share pill */}
                          <div className={`mt-1.5 px-2 py-0.5 border rounded-md text-[9px] font-extrabold tracking-wide leading-none ${balanceColorClass}`}>
                            {balanceText} {balanceAmount > 0 && fmt(balanceAmount, expense.currency)}
                          </div>
                        </div>

                        {/* Actions overlay */}
                        <div 
                          className="flex items-center"
                          onClick={(e) => e.stopPropagation()} // Prevent modal trigger when clicking buttons
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors shrink-0 hidden sm:flex"
                            onClick={() => setViewingExpense(expense)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isPayer && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors shrink-0"
                                onClick={() => openEdit(expense)}
                                title="Edit expense"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                onClick={() => setDeletingExpense(expense)}
                                title="Delete expense"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 border-none rounded-3xl overflow-hidden shadow-2xl">
          {viewingExpense && (
            <div className="relative">
              {/* Receipt Visual Top Stripe */}
              <div className="h-2.5 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 w-full" />
              
              <div className="p-6 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 shadow-sm border border-primary/10">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-extrabold text-xl text-foreground leading-snug px-4">
                    {viewingExpense.title}
                  </h3>
                  <div className="text-3xl font-black text-emerald-500 tracking-tight mt-1">
                    {fmt(viewingExpense.amount, viewingExpense.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Added on {new Date(viewingExpense.created_at * 1000).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>

                <div className="border-t border-b border-dashed border-border py-4 space-y-3.5">
                  {/* Paid By info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Paid by</span>
                    <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full border border-border/50">
                      {(() => {
                        const payer = memberMap.get(viewingExpense.paid_by);
                        return (
                          <>
                            {payer && <Avatar member={payer} size="sm" />}
                            <span className="font-semibold text-foreground text-xs">
                              {viewingExpense.paid_by === currentUserId
                                ? "You"
                                : payer?.name ?? payer?.email}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Split Type info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Split type</span>
                    <span className="font-semibold text-foreground capitalize bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-xs">
                      {viewingExpense.split_type === "equal" ? "Split Equally" : "Split by Shares"}
                    </span>
                  </div>
                </div>

                {/* Notes block */}
                {viewingExpense.notes && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Notes
                    </h5>
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 shadow-sm relative overflow-hidden">
                      {/* Stylized note effect */}
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/30" />
                      <p className="text-sm text-foreground italic whitespace-pre-wrap pl-2 leading-relaxed">
                        {viewingExpense.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Attachments block */}
                {viewingExpense.attachments && viewingExpense.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" /> Attachments ({viewingExpense.attachments.length})
                    </h5>
                    <div className="grid grid-cols-2 gap-2.5">
                      {viewingExpense.attachments.map((att) => {
                        const isImage = att.mime_type.startsWith("image/");
                        const fileUrl = `/api/groups/${groupId}/attachments/${att.id}`;
                        return (
                          <a
                            key={att.id}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 hover:border-primary/20 hover:shadow-sm transition-all text-xs font-semibold group/att"
                          >
                            {isImage ? (
                              <div className="w-9 h-9 rounded-lg bg-card flex-shrink-0 overflow-hidden relative border border-border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={fileUrl}
                                  alt={att.original_name}
                                  className="w-full h-full object-cover group-hover/att:scale-105 transition-transform"
                                />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/5">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 ml-1">
                              <p className="text-foreground truncate font-medium" title={att.original_name}>
                                {att.original_name}
                              </p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {(att.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Split Breakdown with Progress Bars */}
                {viewingExpense.splits.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Split Breakdown
                    </h5>
                    <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                      {(() => {
                        const maxSplitAmount = Math.max(...viewingExpense.splits.map(s => s.amount), 1);
                        return viewingExpense.splits.map((s) => {
                          const m = memberMap.get(s.user_id);
                          const percentage = (s.amount / maxSplitAmount) * 100;
                          return (
                            <div key={s.user_id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                  {m && <Avatar member={m} size="sm" />}
                                  <span className="text-foreground">
                                    {s.user_id === currentUserId ? "You" : s.name ?? s.email}
                                    {viewingExpense.split_type === "shares" && (
                                      <span className="text-muted-foreground/70 ml-1 text-[10px] font-normal">
                                        ({s.shares} share{s.shares !== 1 ? "s" : ""})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="font-bold text-foreground">
                                  {fmt(s.amount, viewingExpense.currency)}
                                </span>
                              </div>
                              {/* Custom split progress bar */}
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary/70 rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Actions at bottom */}
                {viewingExpense.paid_by === currentUserId && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setViewingExpense(null);
                        openEdit(viewingExpense);
                      }}
                      className="flex-1 rounded-xl h-10 font-bold border-border/80 hover:bg-muted"
                    >
                      <Pencil className="w-4 h-4 mr-1.5" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setViewingExpense(null);
                        setDeletingExpense(viewingExpense);
                      }}
                      className="flex-1 rounded-xl h-10 font-bold"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
