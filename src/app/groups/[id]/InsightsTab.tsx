"use client";

import { formatAmount, type CurrencyCode } from "@/lib/currencies";
import type { Member, Expense } from "./types";
import { Avatar } from "./Avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Props {
  expenses: Expense[];
  members: Member[];
  currentUserId: string;
}

export function InsightsTab({ expenses, members, currentUserId }: Props) {
  const fmt = (amount: number, currency: string) => formatAmount(amount, currency as CurrencyCode);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="text-5xl mb-4">📊</div>
        <p className="font-medium">No data yet</p>
        <p className="text-sm mt-1">Add some expenses to see insights</p>
      </div>
    );
  }

  const currencies = Array.from(new Set(expenses.map((e) => e.currency)));
  const sortedByDate = [...expenses].sort((a, b) => a.created_at - b.created_at);
  const daysActive =
    sortedByDate.length > 1
      ? Math.max(1, Math.round((sortedByDate[sortedByDate.length - 1].created_at - sortedByDate[0].created_at) / 86400))
      : 0;

  const payerFrequency = new Map<string, number>();
  for (const e of expenses) {
    payerFrequency.set(e.paid_by, (payerFrequency.get(e.paid_by) ?? 0) + 1);
  }
  const topPayerEntry = ([...payerFrequency.entries()].sort((a, b) => b[1] - a[1])[0] ?? null) as [string, number] | null;

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground">{expenses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Members</p>
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Days Active</p>
              <p className="text-2xl font-bold text-foreground">{daysActive > 0 ? daysActive : "—"}</p>
            </CardContent>
          </Card>
          {topPayerEntry && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Most Active Payer</p>
                <p className="text-base font-bold text-foreground truncate">
                  {topPayerEntry[0] === currentUserId
                    ? "You"
                    : (memberMap.get(topPayerEntry[0])?.name ?? memberMap.get(topPayerEntry[0])?.email ?? "Unknown")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topPayerEntry[1]} expense{topPayerEntry[1] !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Per-currency sections */}
      {currencies.map((currency) => {
        const cExp = expenses.filter((e) => e.currency === currency);
        const totalSpend = cExp.reduce((s, e) => s + e.amount, 0);
        const avgExpense = totalSpend / cExp.length;
        const biggest = [...cExp].sort((a, b) => b.amount - a.amount)[0];

        const paid = new Map<string, number>();
        const owed = new Map<string, number>();
        for (const e of cExp) {
          paid.set(e.paid_by, (paid.get(e.paid_by) ?? 0) + e.amount);
          for (const s of e.splits) {
            owed.set(s.user_id, (owed.get(s.user_id) ?? 0) + s.amount);
          }
        }

        const topSpender = ([...paid.entries()].sort((a, b) => b[1] - a[1])[0] ?? null) as [string, number] | null;
        const mostGenerous = members
          .map((m) => ({ m, net: (paid.get(m.id) ?? 0) - (owed.get(m.id) ?? 0) }))
          .sort((a, b) => b.net - a.net)[0];

        return (
          <div key={currency}>
            {currencies.length > 1 && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{currency}</h3>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-xs text-primary mb-1">Total Spent</p>
                  <p className="text-xl font-bold text-foreground">{fmt(totalSpend, currency)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Avg Expense</p>
                  <p className="text-xl font-bold text-foreground">{fmt(avgExpense, currency)}</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Biggest Single</p>
                  <p className="text-xl font-bold text-foreground">{fmt(biggest.amount, currency)}</p>
                  <p className="text-xs text-muted-foreground truncate">{biggest.title}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {topSpender && memberMap.get(topSpender[0]) && (
                <Card className="bg-amber-500/10 border-amber-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-2xl">💸</span>
                    <div className="min-w-0">
                      <p className="text-xs text-amber-500 font-medium mb-0.5">Biggest Spender</p>
                      <p className="font-bold text-foreground truncate">
                        {topSpender[0] === currentUserId
                          ? "You"
                          : (memberMap.get(topSpender[0])?.name ?? memberMap.get(topSpender[0])?.email)}
                      </p>
                      <p className="text-xs text-muted-foreground">paid {fmt(topSpender[1], currency)} total</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {mostGenerous && mostGenerous.net > 0.01 && (
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-2xl">🤝</span>
                    <div className="min-w-0">
                      <p className="text-xs text-emerald-500 font-medium mb-0.5">Most Generous</p>
                      <p className="font-bold text-foreground truncate">
                        {mostGenerous.m.id === currentUserId
                          ? "You"
                          : (mostGenerous.m.name ?? mostGenerous.m.email)}
                      </p>
                      <p className="text-xs text-muted-foreground">overpaid by {fmt(mostGenerous.net, currency)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader className="px-4 py-3 pb-0">
                <CardTitle className="text-sm font-semibold">Member Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {members.map((m) => {
                    const mPaid = paid.get(m.id) ?? 0;
                    const mOwed = owed.get(m.id) ?? 0;
                    const net = mPaid - mOwed;
                    if (mPaid === 0 && mOwed === 0) return null;
                    return (
                      <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                        <Avatar member={m} size="sm" />
                        <p className="flex-1 text-sm font-medium text-foreground truncate min-w-0">
                          {m.id === currentUserId ? "You" : (m.name ?? m.email)}
                        </p>
                        <div className="text-right text-xs text-muted-foreground flex-shrink-0 space-y-0.5">
                          <p>paid <span className="font-semibold text-foreground">{fmt(mPaid, currency)}</span></p>
                          <p>share <span className="font-semibold text-foreground">{fmt(mOwed, currency)}</span></p>
                        </div>
                        <p className={`text-sm font-bold flex-shrink-0 w-20 text-right ${net > 0.005 ? "text-emerald-500" : net < -0.005 ? "text-destructive" : "text-muted-foreground"}`}>
                          {net > 0.005 ? "+" : ""}{fmt(net, currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
