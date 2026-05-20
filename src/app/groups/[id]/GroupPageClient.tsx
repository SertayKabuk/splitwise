"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Member, Expense, Balance, Group, Settlement } from "./types";
import { ExpensesTab } from "./ExpensesTab";
import { BalancesTab } from "./BalancesTab";
import { MembersTab } from "./MembersTab";
import { InsightsTab } from "./InsightsTab";
import { TransactionsTab } from "./TransactionsTab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Share2,
  Check,
  Eye,
  Copy,
  RefreshCw,
  Receipt,
  Scale,
  ArrowLeftRight,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  group: Group;
  members: Member[];
  expenses: Expense[];
  balances: Balance[];
  settlements: Settlement[];
  currentUserId: string;
}

export default function GroupPageClient({
  group,
  members,
  expenses: initialExpenses,
  balances: initialBalances,
  settlements: initialSettlements,
  currentUserId,
}: Props) {
  const router = useRouter();
  const isCreator = group.created_by === currentUserId;
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [expenseList, setExpenseList] = useState<Expense[]>(initialExpenses);
  const [balances, setBalances] = useState<Balance[]>(initialBalances);
  const [settlements, setSettlements] = useState<Settlement[]>(initialSettlements);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);

  const [showViewLink, setShowViewLink] = useState(false);
  const [viewCode, setViewCode] = useState<string | null>(group.view_code);
  const [copiedViewLink, setCopiedViewLink] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [viewError, setViewError] = useState("");

  const viewUrl =
    viewCode && typeof window !== "undefined"
      ? `${window.location.origin}/view/${viewCode}`
      : viewCode
      ? `/view/${viewCode}`
      : "";

  const handleCopyViewLink = () => {
    if (!viewUrl) return;
    navigator.clipboard.writeText(viewUrl).then(() => {
      setCopiedViewLink(true);
      setTimeout(() => setCopiedViewLink(false), 2000);
    });
  };

  const handleShareViewLink = async () => {
    if (!viewUrl) return;
    const text = `Here's a read-only view of "${group.name}" on GroupSplit: ${viewUrl}`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${group.name} on GroupSplit`,
          text,
          url: viewUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleRotateViewCode = async () => {
    if (!confirm("Regenerate the read-only link? The current link will stop working.")) return;
    setRotating(true);
    setViewError("");
    try {
      const res = await fetch(`/api/groups/${group.id}/view-code`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to regenerate link");
      }
      const data = await res.json();
      setViewCode(data.view_code as string);
    } catch (err) {
      setViewError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRotating(false);
    }
  };

  const refreshBalancesAndSettlements = async () => {
    const [balancesRes, settlementsRes] = await Promise.all([
      fetch(`/api/groups/${group.id}/balances`),
      fetch(`/api/groups/${group.id}/settlements`),
    ]);

    if (!balancesRes.ok) {
      const data = await balancesRes.json().catch(() => null);
      throw new Error(data?.error ?? "Failed to refresh balances");
    }

    if (!settlementsRes.ok) {
      const data = await settlementsRes.json().catch(() => null);
      throw new Error(data?.error ?? "Failed to refresh transactions");
    }

    const [nextBalances, nextSettlements] = await Promise.all([balancesRes.json(), settlementsRes.json()]);
    setBalances(nextBalances);
    setSettlements(nextSettlements);
  };

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/join/${group.invite_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDeleteGroup = async () => {
    setDeleteGroupLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to delete group");
        return;
      }
      router.push("/dashboard");
    } catch {
      alert("Failed to delete group");
    } finally {
      setDeleteGroupLoading(false);
      setShowDeleteGroup(false);
    }
  };

  const mobileTabs: {
    value: string;
    label: string;
    icon: typeof Receipt;
    count: number;
    dotClass: string;
  }[] = [
    { value: "expenses", label: "Expenses", icon: Receipt, count: expenseList.length, dotClass: "bg-foreground/70" },
    { value: "balances", label: "Balances", icon: Scale, count: balances.length, dotClass: "bg-destructive" },
    { value: "transactions", label: "Activity", icon: ArrowLeftRight, count: settlements.length, dotClass: "bg-emerald-500" },
    { value: "members", label: "Members", icon: Users, count: 0, dotClass: "" },
    { value: "insights", label: "Insights", icon: BarChart3, count: 0, dotClass: "" },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          {group.description && <p className="text-muted-foreground mt-1">{group.description}</p>}
          <p className="text-muted-foreground text-sm mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isCreator && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setViewError("");
                setShowViewLink(true);
              }}
              className="shrink-0 text-muted-foreground hover:text-primary"
              title="Read-only link"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          {isCreator && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDeleteGroup(true)}
              className="shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10"
              title="Delete group"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleCopyInvite}
            className={cn(
              "gap-2 flex-1 min-w-0 sm:flex-none sm:w-auto",
              copied && "text-emerald-600 border-emerald-300"
            )}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Share Invite Link</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full hidden sm:inline-flex">
          <TabsTrigger value="expenses" className="gap-1.5">
            Expenses
            {expenseList.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{expenseList.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="balances" className="gap-1.5">
            Balances
            {balances.length > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">{balances.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5">
            Transactions
            {settlements.length > 0 && (
              <Badge className="text-xs px-1.5 py-0 bg-emerald-500 hover:bg-emerald-600">{settlements.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <ExpensesTab
            groupId={group.id}
            expenses={expenseList}
            members={members}
            currentUserId={currentUserId}
            onRefresh={(expenses, balances) => {
              setExpenseList(expenses);
              setBalances(balances);
            }}
          />
        </TabsContent>

        <TabsContent value="balances">
          <BalancesTab
            groupId={group.id}
            balances={balances}
            members={members}
            currentUserId={currentUserId}
            onSettlementRecorded={refreshBalancesAndSettlements}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab settlements={settlements} members={members} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab members={members} group={group} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab expenses={expenseList} members={members} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>

      {/* Delete Group Confirmation Modal */}
      <Dialog open={showDeleteGroup} onOpenChange={setShowDeleteGroup}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">&ldquo;{group.name}&rdquo;</span>?
              This will permanently delete all expenses, splits, and settlements in this group.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteGroup(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={deleteGroupLoading}
              className="flex-1"
            >
              {deleteGroupLoading ? "Deleting..." : "Delete Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile bottom tab bar */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Group sections"
      >
        <div className="flex">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-semibold text-white flex items-center justify-center",
                        tab.dotClass || "bg-foreground/70"
                      )}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-full px-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Read-only Link Modal */}
      <Dialog open={showViewLink} onOpenChange={setShowViewLink}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Read-only link</DialogTitle>
            <DialogDescription>
              Anyone with this link can view expenses and balances. They can&apos;t add, edit, or
              see member contact info.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={viewUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyViewLink}
                title="Copy link"
              >
                {copiedViewLink ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {viewError && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                {viewError}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleShareViewLink} className="flex-1 gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={handleRotateViewCode}
                disabled={rotating}
                className="gap-2"
                title="Regenerate"
              >
                <RefreshCw className={`w-4 h-4 ${rotating ? "animate-spin" : ""}`} />
                {rotating ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
