# AGENTS.md

Guidelines for AI agents working on this codebase.

## Project Overview

GroupSplit is a Next.js 16 (App Router) expense-splitting app. The backend is a set of Next.js API routes backed by a SQLite database (better-sqlite3). Authentication uses NextAuth v5 with Google OAuth.

## Repository Layout

```
src/app/                  # Next.js pages and API routes
src/app/api/              # REST handlers
src/components/           # Shared React components (Navbar, SessionProvider)
src/lib/                  # Business logic and utilities
  auth.ts                 # NextAuth configuration
  db.ts                   # SQLite schema + singleton connection
  splits.ts               # computeSplits() — equal and shares modes
  balance.ts              # calculateBalances() — greedy debt minimisation
  currencies.ts           # CURRENCIES map, formatAmount()
  initials.ts             # getInitials() for avatar fallback
src/types/next-auth.d.ts  # Extends NextAuth Session with user.id
data/splitwise.db         # SQLite file, created on first run (gitignored)
```

## Key Conventions

### Database

- Schema is defined in `src/lib/db.ts` inside `db.exec(...)`. The `CREATE TABLE IF NOT EXISTS` pattern means schema changes are **not** applied to existing databases automatically — drop `data/splitwise.db` and restart to pick up changes.
- All multi-table writes use `db.transaction(() => { ... })()`.
- The singleton connection is exported from `src/lib/db.ts` as both a named and default export (`getDb()`).
- Foreign keys are enabled (`PRAGMA foreign_keys = ON`) and WAL mode is active.

### API Routes

- All routes authenticate with `const session = await auth()` at the top and return 401 if no session.
- Group membership is verified before any group-scoped operation.
- Only the expense payer (`paid_by`) can edit or delete an expense — enforced at the API level (403 otherwise).
- Route params are always `await`ed: `const { id } = await params`.

### Expense Splits

- `computeSplits(amount, splitWith, splitType)` in `src/lib/splits.ts` returns `{ userId, amount }[]`.
- `split_type` (`'equal'` or `'shares'`) is stored on the `expenses` table.
- Original `shares` (integer weight per participant) are stored on `expense_splits` so the edit modal can restore them exactly.
- Pass `sharesMap` when inserting splits to persist original share values alongside the computed `amount`.

### Client State

- `GroupPageClient.tsx` holds all interactive state for the group page (add/edit/delete modals, balances, expense list).
- After any mutation, refresh both `/api/groups/[id]/expenses` and `/api/groups/[id]/balances` and update state.
- `openEdit(expense)` reads `expense.split_type` and `s.shares` directly from the expense object — no inference from amounts.
- Edit and delete buttons are shown only when `expense.paid_by === currentUserId`.

### Currencies

- Supported codes: `TRY`, `USD`, `EUR`, `NOK` — defined in `src/lib/currencies.ts`.
- Always validate currency against `CURRENCIES` in API routes before inserting.
- Use `formatAmount(amount, currency)` for display.

## Running Locally

```bash
pnpm install
cp .env.local.example .env.local   # fill in Google OAuth + AUTH_SECRET
pnpm dev
```

## Running Tests

There is currently no test suite. When adding tests, prefer integration tests against a real (in-memory or temp file) SQLite database rather than mocking `db`.

## Common Tasks

### Add a new field to a table

1. Update the `CREATE TABLE` statement in `src/lib/db.ts`.
2. Update all `SELECT` queries that read from that table (in API routes and `page.tsx`).
3. Update `INSERT`/`UPDATE` statements in API routes.
4. Update the TypeScript interfaces in `GroupPageClient.tsx` and any server-side type casts.
5. Drop `data/splitwise.db` and restart the dev server.

### Add a new currency

1. Add the entry to the `CURRENCIES` object in `src/lib/currencies.ts`.

### Add a new API route

1. Create a file at `src/app/api/<path>/route.ts`.
2. Always check `session?.user?.id` first.
3. For group-scoped routes, verify `group_members` membership before proceeding.

### Add a new modal to GroupPageClient

1. Add `useState` for the open/close state and any data it needs.
2. Render the modal JSX conditionally at the bottom of the component's return, alongside the other modals.
3. Use the same modal shell pattern: `fixed inset-0 z-50` overlay + `bg-white rounded-2xl shadow-xl` panel.
