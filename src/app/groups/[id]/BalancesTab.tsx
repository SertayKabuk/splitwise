"use client";

import { useState } from "react";
import { formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Balance } from "./types";
import { Avatar } from "./Avatar";

interface Props {
  groupId: string;
  balances: Balance[];
  members: Member[];
  currentUserId: string;
  onBalancesChange: (balances: Balance[]) => void;
}

export function BalancesTab({ groupId, balances, members, currentUserId, onBalancesChange }: Props) {
  const fmt = (amount: number, currency: string) => formatAmount(amount, currency as CurrencyCode);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const [settleDebt, setSettleDebt] = useState<Balance | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);

  const handleSettle = async () => {
    if (!settleDebt) return;
    setSettleLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUser: settleDebt.fromUserId,
          toUser: settleDebt.toUserId,
          amount: settleDebt.amount,
          currency: settleDebt.currency,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to record settlement");
      }
      const balancesRes = await fetch(`/api/groups/${groupId}/balances`);
      if (balancesRes.ok) onBalancesChange(await balancesRes.json());
      setSettleDebt(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSettleLoading(false);
    }
  };

  return (
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
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {memberMap.get(balance.fromUserId) && (
                    <Avatar member={memberMap.get(balance.fromUserId)!} size="sm" />
                  )}
                  <span className="font-medium text-slate-900 text-sm truncate">
                    {balance.fromUserId === currentUserId ? "You" : balance.fromUserName}
                  </span>
                </div>
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div className="flex items-center gap-2 min-w-0">
                  {memberMap.get(balance.toUserId) && (
                    <Avatar member={memberMap.get(balance.toUserId)!} size="sm" />
                  )}
                  <span className="font-medium text-slate-900 text-sm truncate">
                    {balance.toUserId === currentUserId ? "You" : balance.toUserName}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                <span className="font-bold text-red-500 text-lg">{fmt(balance.amount, balance.currency)}</span>
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

      {/* Settle Confirmation Modal */}
      {settleDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSettleDebt(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Confirm Settlement</h2>
            <p className="text-slate-600 mb-4">
              Are you sure you want to record that{" "}
              <span className="font-semibold">
                {settleDebt.fromUserId === currentUserId ? "You" : settleDebt.fromUserName}
              </span>{" "}
              paid{" "}
              <span className="font-semibold text-emerald-600">{fmt(settleDebt.amount, settleDebt.currency)}</span>{" "}
              to{" "}
              <span className="font-semibold">
                {settleDebt.toUserId === currentUserId ? "You" : settleDebt.toUserName}
              </span>
              ?
            </p>
            {memberMap.get(settleDebt.toUserId)?.iban && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 mb-6">
                <p className="text-xs text-slate-500 mb-0.5">
                  {settleDebt.toUserId === currentUserId ? "Your" : `${settleDebt.toUserName}'s`} IBAN
                </p>
                <p className="font-mono text-sm text-slate-800 break-all">
                  {memberMap.get(settleDebt.toUserId)?.iban}
                </p>
              </div>
            )}
            {!memberMap.get(settleDebt.toUserId)?.iban && <div className="mb-6" />}
            <div className="flex gap-3">
              <button onClick={() => setSettleDebt(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSettle} disabled={settleLoading} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">{settleLoading ? "Settling..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
