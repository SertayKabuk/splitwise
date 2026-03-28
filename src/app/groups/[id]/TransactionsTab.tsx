"use client";

import { formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Settlement } from "./types";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/badge";

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
        <h3 className="text-lg font-semibold text-foreground">No transactions yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">Settlements you record will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((settlement) => (
        <div
          key={settlement.id}
          className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {memberMap.get(settlement.fromUserId) && (
              <Avatar member={memberMap.get(settlement.fromUserId)!} size="sm" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <span className="font-semibold">
                  {settlement.fromUserId === currentUserId ? "You" : settlement.fromUserName}
                </span>
                <span className="text-muted-foreground">paid</span>
                <span className="font-semibold text-emerald-500">{fmt(settlement.amount, settlement.currency)}</span>
                <span className="text-muted-foreground">to</span>
                <div className="inline-flex items-center gap-2 min-w-0">
                  {memberMap.get(settlement.toUserId) && (
                    <Avatar member={memberMap.get(settlement.toUserId)!} size="sm" />
                  )}
                  <span className="font-semibold truncate">
                    {settlement.toUserId === currentUserId ? "You" : settlement.toUserName}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Recorded {formatDate(settlement.settledAt)}</p>
            </div>
          </div>
          <Badge className="self-start sm:self-center bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-800">
            Settled
          </Badge>
        </div>
      ))}
    </div>
  );
}
