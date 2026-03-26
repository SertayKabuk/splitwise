"use client";

import { formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Settlement } from "./types";
import { Avatar } from "./Avatar";

interface Props {
  settlements: Settlement[];
  members: Member[];
  currentUserId: string;
}

export function TransactionsTab({ settlements, members, currentUserId }: Props) {
  const fmt = (amount: number, currency: string) => formatAmount(amount, currency as CurrencyCode);
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp * 1000));

  if (settlements.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🧾</div>
        <h3 className="text-lg font-semibold text-slate-700">No transactions yet</h3>
        <p className="text-slate-500 mt-1 text-sm">Settlements you record will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((settlement) => (
        <div
          key={settlement.id}
          className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {memberMap.get(settlement.fromUserId) && (
              <Avatar member={memberMap.get(settlement.fromUserId)!} size="sm" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  {settlement.fromUserId === currentUserId ? "You" : settlement.fromUserName}
                </span>
                <span>paid</span>
                <span className="font-semibold text-emerald-600">{fmt(settlement.amount, settlement.currency)}</span>
                <span>to</span>
                <div className="inline-flex items-center gap-2 min-w-0">
                  {memberMap.get(settlement.toUserId) && (
                    <Avatar member={memberMap.get(settlement.toUserId)!} size="sm" />
                  )}
                  <span className="font-semibold text-slate-900 truncate">
                    {settlement.toUserId === currentUserId ? "You" : settlement.toUserName}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Recorded {formatDate(settlement.settledAt)}</p>
            </div>
          </div>
          <span className="inline-flex items-center self-start sm:self-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            Settled
          </span>
        </div>
      ))}
    </div>
  );
}
