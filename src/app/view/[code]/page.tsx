import { notFound } from "next/navigation";
import getDb from "@/lib/db";
import { calculateBalances } from "@/lib/balance";
import { formatAmount, type CurrencyCode } from "@/lib/currencies";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const dynamic = "force-dynamic";

export default async function ViewPage({ params }: PageProps) {
  const db = getDb();
  const { code } = await params;

  const group = db
    .prepare(
      "SELECT id, name, description FROM groups WHERE view_code = ?"
    )
    .get(code) as { id: string; name: string; description: string | null } | undefined;

  if (!group) {
    notFound();
  }

  const members = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.is_placeholder, gm.sponsored_by
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`
    )
    .all(group.id) as Array<{
      id: string;
      name: string | null;
      email: string;
      is_placeholder: number;
      sponsored_by: string | null;
    }>;

  const displayName = (id: string): string => {
    const m = members.find((x) => x.id === id);
    if (!m) return "Unknown";
    if (m.name) return m.name;
    return m.is_placeholder === 1 ? "Unnamed" : m.email;
  };

  const rawExpenses = db
    .prepare(
      `SELECT e.id, e.title, e.amount, e.currency, e.paid_by, e.split_type, e.created_at
       FROM expenses e
       WHERE e.group_id = ?
       ORDER BY e.created_at DESC`
    )
    .all(group.id) as Array<{
      id: string;
      title: string;
      amount: number;
      currency: string;
      paid_by: string;
      split_type: string;
      created_at: number;
    }>;

  const rawSplits = db
    .prepare(
      `SELECT es.expense_id, es.user_id, es.amount, es.shares
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = ?`
    )
    .all(group.id) as Array<{
      expense_id: string;
      user_id: string;
      amount: number;
      shares: number;
    }>;

  const splitsByExpense: Record<string, typeof rawSplits> = {};
  for (const s of rawSplits) {
    if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
    splitsByExpense[s.expense_id].push(s);
  }

  const rawSettlements = db
    .prepare(
      "SELECT from_user, to_user, amount, currency FROM settlements WHERE group_id = ?"
    )
    .all(group.id) as Array<{
      from_user: string;
      to_user: string;
      amount: number;
      currency: string;
    }>;

  const sponsorMap = new Map<string, string>();
  for (const m of members) {
    if (m.sponsored_by) {
      sponsorMap.set(m.id, m.sponsored_by);
    }
  }

  const balances = calculateBalances(
    members.map((m) => ({ id: m.id, name: m.name, email: m.email })),
    rawExpenses.map((e) => ({
      id: e.id,
      paidBy: e.paid_by,
      amount: e.amount,
      currency: e.currency,
      splits: (splitsByExpense[e.id] ?? []).map((s) => ({ userId: s.user_id, amount: s.amount })),
    })),
    rawSettlements.map((s) => ({ fromUser: s.from_user, toUser: s.to_user, amount: s.amount, currency: s.currency })),
    sponsorMap.size > 0 ? sponsorMap : undefined
  );

  const fmt = (amount: number, currency: string) => formatAmount(amount, currency as CurrencyCode);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Badge variant="outline" className="gap-1.5 mb-3">
          <Eye className="w-3 h-3" />
          Read-only view
        </Badge>
        <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
        {group.description && (
          <p className="text-muted-foreground mt-1">{group.description}</p>
        )}
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Balances
        </h2>
        {balances.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">
            Everyone is settled up.
          </div>
        ) : (
          <div className="space-y-2">
            {balances.map((b, i) => (
              <div
                key={`${b.fromUserId}-${b.toUserId}-${b.currency}-${i}`}
                className="bg-card border border-border rounded-xl p-3 flex items-center justify-between text-sm"
              >
                <span className="text-foreground">
                  <span className="font-medium">{displayName(b.fromUserId)}</span>
                  <span className="text-muted-foreground"> owes </span>
                  <span className="font-medium">{displayName(b.toUserId)}</span>
                </span>
                <span className="font-semibold text-foreground">
                  {fmt(b.amount, b.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Expenses ({rawExpenses.length})
        </h2>
        {rawExpenses.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">
            No expenses yet.
          </div>
        ) : (
          <div className="space-y-3">
            {rawExpenses.map((e) => {
              const splits = splitsByExpense[e.id] ?? [];
              return (
                <div
                  key={e.id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{e.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Paid by{" "}
                        <span className="font-medium text-foreground">
                          {displayName(e.paid_by)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(e.created_at * 1000).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-emerald-500 flex-shrink-0">
                      {fmt(e.amount, e.currency)}
                    </p>
                  </div>
                  {splits.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-1">
                        {splits.map((s) => (
                          <div
                            key={`${e.id}-${s.user_id}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {displayName(s.user_id)}
                              {e.split_type === "shares" && (
                                <span className="text-muted-foreground/60 ml-1">
                                  ({s.shares} share{s.shares !== 1 ? "s" : ""})
                                </span>
                              )}
                            </span>
                            <span className="font-medium text-foreground">
                              {fmt(s.amount, e.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground/70 mt-10 text-center">
        This is a read-only snapshot. Members of the group can edit balances.
      </p>
    </main>
  );
}
