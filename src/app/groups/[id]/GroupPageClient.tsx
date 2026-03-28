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
import { Trash2, Share2, Check } from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const [expenseList, setExpenseList] = useState<Expense[]>(initialExpenses);
  const [balances, setBalances] = useState<Balance[]>(initialBalances);
  const [settlements, setSettlements] = useState<Settlement[]>(initialSettlements);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);

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

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
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
          {group.created_by === currentUserId && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDeleteGroup(true)}
              className="text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10"
              title="Delete group"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleCopyInvite}
            className={`gap-2 w-full sm:w-auto ${copied ? "text-emerald-600 border-emerald-300" : ""}`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share Invite Link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses">
        <TabsList className="mb-6 w-full overflow-x-auto flex h-auto flex-wrap sm:flex-nowrap">
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
    </main>
  );
}
