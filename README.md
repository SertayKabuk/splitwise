# GroupSplit

A self-hosted expense splitting app built with Next.js and SQLite. Share costs within groups, track who owes what, and record settlements — with multi-currency support.

## Features

- **Google sign-in** via OAuth
- **Groups** — create groups and invite members via a shareable link
- **Expenses** — add expenses with equal or weighted share splits
- **Multi-currency** — TRY, USD, EUR, NOK
- **Balances** — automatic debt calculation that minimises the number of settlements
- **Settlements** — record payments to clear debts
- **IBAN** — store bank account numbers on your profile for easy transfers

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, React 19)
- [NextAuth v5](https://authjs.dev/) — Google OAuth, JWT sessions
- [SQLite](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Tailwind CSS 3](https://tailwindcss.com/)
- TypeScript (strict mode)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A Google OAuth app ([console.cloud.google.com](https://console.cloud.google.com))

### Local Development

1. **Clone and install dependencies**

   ```bash
   git clone <repo-url>
   cd splitwise
   pnpm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local`:

   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   AUTH_SECRET=your-random-secret        # openssl rand -hex 32
   AUTH_URL=http://localhost:3000
   ```

3. **Run the dev server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

   The SQLite database is created automatically at `./data/splitwise.db` on first run.

### Production Build

```bash
pnpm build
pnpm start
```

### Docker

The Docker image is published to `ghcr.io/sertaykabuk/splitwise:main` via GitHub Actions.

**Run with Docker Compose** (uses Traefik as a reverse proxy):

```bash
# Set environment variables (or create a .env file)
export AUTH_URL=https://your-domain.com
export AUTH_SECRET=$(openssl rand -hex 32)
export GOOGLE_CLIENT_ID=...
export GOOGLE_CLIENT_SECRET=...

docker-compose up -d
```

SQLite data is persisted in the `split_data` Docker volume.

**Build locally:**

```bash
docker build -t splitwise:latest .
```

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AUTH_SECRET` | Random secret for signing JWT sessions |
| `AUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing / sign-in page
│   ├── dashboard/                # Group list & creation
│   ├── groups/[id]/              # Group detail (expenses, balances, members)
│   ├── profile/                  # User profile & IBAN
│   ├── join/[code]/              # Join group via invite link
│   └── api/                      # REST API routes
│       ├── groups/
│       │   └── [id]/
│       │       ├── expenses/     # GET/POST expenses
│       │       ├── expenses/[expenseId]/  # PUT/DELETE expense
│       │       ├── balances/     # GET calculated debts
│       │       └── settle/       # POST settlement
│       ├── join/[code]/          # Validate & accept invite
│       └── profile/              # GET/PUT user profile
├── components/
│   ├── Navbar.tsx
│   └── SessionProvider.tsx
└── lib/
    ├── auth.ts                   # NextAuth config
    ├── db.ts                     # SQLite schema & connection
    ├── splits.ts                 # Split calculation (equal / shares)
    ├── balance.ts                # Debt minimisation algorithm
    └── currencies.ts             # Currency definitions & formatting
```

## How Splits Work

**Equal** — the total is divided evenly across all selected members, with any remainder cents distributed one-by-one.

**Shares** — each member is assigned a share weight (integer ≥ 1). Each person pays `total × their_shares / total_shares`. Remainder cents are distributed the same way.

Only the member who paid for an expense can edit or delete it.

## How Balances Work

Balances are calculated per currency from all expenses and recorded settlements. A greedy algorithm matches the largest creditor with the largest debtor repeatedly, minimising the total number of transfers needed.
