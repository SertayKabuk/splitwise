"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Member, Expense, Balance, Group, Settlement } from "./types";
import { ExpensesTab } from "./ExpensesTab";
import { BalancesTab } from "./BalancesTab";
import { MembersTab } from "./MembersTab";
import { InsightsTab } from "./InsightsTab";
import { TransactionsTab } from "./TransactionsTab";

interface Props {
  group: Group;
  members: Member[];
  expenses: Expense[];
  balances: Balance[];
  settlements: Settlement[];
  currentUserId: string;
}

type Tab = "expenses" | "balances" | "transactions" | "members" | "insights";

export default function GroupPageClient({
  group,
  members,
  expenses: initialExpenses,
  balances: initialBalances,
  settlements: initialSettlements,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
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
          <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
          {group.description && <p className="text-slate-500 mt-1">{group.description}</p>}
          <p className="text-slate-400 text-sm mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {group.created_by === currentUserId && (
            <button
              onClick={() => setShowDeleteGroup(true)}
              className="p-2.5 border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
              title="Delete group"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={handleCopyInvite}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-medium rounded-lg transition-all text-sm"
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
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {(["expenses", "balances", "transactions", "members", "insights"] as Tab[]).map((tab) => (
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
              {tab === "transactions" && settlements.length > 0 && (
                <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">
                  {settlements.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "expenses" && (
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
      )}
      {activeTab === "balances" && (
        <BalancesTab
          groupId={group.id}
          balances={balances}
          members={members}
          currentUserId={currentUserId}
          onSettlementRecorded={refreshBalancesAndSettlements}
        />
      )}
      {activeTab === "transactions" && (
        <TransactionsTab settlements={settlements} members={members} currentUserId={currentUserId} />
      )}
      {activeTab === "members" && (
        <MembersTab members={members} group={group} currentUserId={currentUserId} />
      )}
      {activeTab === "insights" && (
        <InsightsTab expenses={expenseList} members={members} currentUserId={currentUserId} />
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteGroup(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Delete Group</h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold">&ldquo;{group.name}&rdquo;</span>?
              This will permanently delete all expenses, splits, and settlements in this group.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteGroup(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteGroupLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {deleteGroupLoading ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
