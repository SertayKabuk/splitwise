"use client";

import { useState } from "react";
import { formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Balance } from "./types";
import { Avatar } from "./Avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";

interface Props {
  groupId: string;
  balances: Balance[];
  members: Member[];
  currentUserId: string;
  onSettlementRecorded: () => Promise<void> | void;
}

export function BalancesTab({ groupId, balances, members, currentUserId, onSettlementRecorded }: Props) {
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
      await onSettlementRecorded();
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
          <h3 className="text-lg font-semibold text-foreground">All settled up!</h3>
          <p className="text-muted-foreground mt-1 text-sm">No outstanding debts in this group</p>
        </div>
      ) : (
        <div className="space-y-3">
          {balances.map((balance, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {memberMap.get(balance.fromUserId) && (
                    <Avatar member={memberMap.get(balance.fromUserId)!} size="sm" />
                  )}
                  <span className="font-medium text-foreground text-sm truncate">
                    {balance.fromUserId === currentUserId ? "You" : balance.fromUserName}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-2 min-w-0">
                  {memberMap.get(balance.toUserId) && (
                    <Avatar member={memberMap.get(balance.toUserId)!} size="sm" />
                  )}
                  <span className="font-medium text-foreground text-sm truncate">
                    {balance.toUserId === currentUserId ? "You" : balance.toUserName}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                <span className="font-bold text-destructive text-lg">{fmt(balance.amount, balance.currency)}</span>
                {balance.fromUserId === currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettleDebt(balance)}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
                  >
                    Settle
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settle Confirmation Modal */}
      <Dialog open={!!settleDebt} onOpenChange={(open) => !open && setSettleDebt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Settlement</DialogTitle>
            <DialogDescription asChild>
              <div>
                <span>
                  Are you sure you want to record that{" "}
                  <span className="font-semibold text-foreground">
                    {settleDebt?.fromUserId === currentUserId ? "You" : settleDebt?.fromUserName}
                  </span>{" "}
                  paid{" "}
                  <span className="font-semibold text-emerald-500">{settleDebt ? fmt(settleDebt.amount, settleDebt.currency) : ""}</span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {settleDebt?.toUserId === currentUserId ? "You" : settleDebt?.toUserName}
                  </span>
                  ?
                </span>
                {settleDebt && memberMap.get(settleDebt.toUserId)?.iban && (
                  <div className="bg-muted rounded-lg px-3 py-2.5 mt-3">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {settleDebt.toUserId === currentUserId ? "Your" : `${settleDebt.toUserName}'s`} IBAN
                    </p>
                    <p className="font-mono text-sm text-foreground break-all">
                      {memberMap.get(settleDebt.toUserId)?.iban}
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setSettleDebt(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSettle}
              disabled={settleLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {settleLoading ? "Settling..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
