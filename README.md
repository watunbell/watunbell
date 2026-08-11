# Department Inventory & Equipment Management System

A near-real-time inventory and equipment management system for a university
academic department, built with **Next.js (TypeScript)**, **Tailwind CSS**, and
a **Google-native backend** — Google Sheets as the datastore and Google OAuth
for sign-in. No Firebase.

> This project lives on the `claude/university-inventory-system-*` branch. The
> repository's default branch hosts an unrelated project (Flow Cytometry
> Simulator); the leftover `index.html` at the repo root belongs to that
> project and is not used by this app.

## Features

- **Authentication** — Google sign-in (via NextAuth) restricted to the
  department's Google Workspace domain (`@g.swu.ac.th`), enforced server-side in
  the NextAuth `signIn` callback and on every API route.
- **Near-real-time dashboard** — total inventory, low-stock alerts, and
  equipment status distribution, with a bar chart (category breakdown) and donut
  chart (status summary). The client polls every ~4s and refreshes instantly
  after edits, so all clients stay in sync without a manual refresh.
- **Inventory CRUD** — create, read, update, delete assets, with live search and
  category filtering.
- **Categorization** — Lab Equipment, Reagents/Chemicals (with expiry tracking),
  IT/Computing Devices, General Office Supplies.
- **Status tracking** — instant status updates for durable goods (ครุภัณฑ์):
  Available, In-Use/Borrowed, Maintenance/Broken, Retired.
- **Reporting export** — one-click CSV export (UTF-8 BOM, respects the active
  search/category filters) for faculty reporting.

## Tech stack

| Layer          | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 14 (App Router, TypeScript)               |
| Styling / UI   | Tailwind CSS, lucide-react icons                  |
| Auth           | NextAuth + Google OAuth (domain-restricted)       |
| Data store     | Google Sheets (via Sheets API + service account)  |
| Live updates   | Client polling + post-mutation refresh            |
| Charts         | Recharts                                          |

## Architecture

```
Browser ──(Google sign-in)──▶ NextAuth ──▶ session (@g.swu.ac.th only)
   │
   │  fetch /api/items (polled ~4s)
   ▼
Next.js API routes ──(auth check)──▶ Google Sheets API ──▶ the Sheet
                     via service account
```

Users authenticate with their own Google account, but the app reads/writes the
sheet with a **service account**, so the sheet is never shared with end users.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure env (see the one-time setup below)
cp .env.example .env.local

# 3. Seed the sheet with a header row + sample data (optional)
npm run seed

# 4. Run the dev server
npm run dev            # http://localhost:3000
```

### One-time Google setup

**OAuth (sign-in):**
1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client
   ID → Web application**.
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   (add your production URL too).
3. Put the client id/secret into `.env.local` (`GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`), and set `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
4. (Recommended) Set the OAuth consent screen to **Internal** for your
   `g.swu.ac.th` Workspace so only department accounts can reach it.

**Sheets (data):**
1. Create a Google Sheet; copy its id from the URL.
2. Google Cloud Console → enable the **Google Sheets API**, create a **service
   account**, generate a **JSON key**.
3. **Share the sheet** with the service account email as an **Editor**.
4. Fill in `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and
   `GOOGLE_SHEETS_SPREADSHEET_ID` in `.env.local`.

Full column layout is in [`docs/SHEETS_SCHEMA.md`](docs/SHEETS_SCHEMA.md).

## Project structure

```
src/
  app/
    layout.tsx              # Root: Providers (NextAuth) + AppShell
    page.tsx                # Redirects to /dashboard
    dashboard/page.tsx      # Stat cards + bar/donut charts
    inventory/page.tsx      # CRUD table, search/filter, CSV export
    api/
      auth/[...nextauth]/   # NextAuth route handler
      items/                # GET/POST items
      items/[id]/           # PATCH/DELETE an item
  components/
    Providers.tsx           # SessionProvider wrapper
    AppShell.tsx            # Auth gate + sidebar/main chrome
    auth/                   # SignInScreen
    inventory/              # ItemForm, StatusSelect, DeleteConfirm
    charts/                 # CategoryBarChart, StatusDonutChart, ChartCard
    ui/                     # Modal, form fields
  context/AuthContext.tsx   # useAuth adapter over NextAuth session
  hooks/useItems.ts         # Polling + change-event data hook
  lib/
    authOptions.ts          # NextAuth config (Google, domain restriction)
    apiAuth.ts              # API route guard (server-only)
    googleSheets.ts         # Sheets read/write (server-only)
    items.ts                # Client CRUD (fetch) + stats aggregation
    types.ts                # Domain model
    constants.ts            # Categories, statuses, ALLOWED_DOMAIN
    export.ts               # CSV report builder + download
    utils.ts                # Formatting + class-name helpers
scripts/seed.ts             # Sheet seeder (header + sample data)
docs/SHEETS_SCHEMA.md       # Data model reference
```

## Security

Access is gated on two layers:

- **Sign-in** — NextAuth's `signIn` callback (`src/lib/authOptions.ts`) rejects
  any account whose email is not on `@g.swu.ac.th`, so no session is issued.
- **API routes** — every `/api/items` handler calls `requireAllowedUser()`
  before touching the sheet; unauthenticated or wrong-domain requests get 401.
  The sheet itself is reachable only via the service account, never by the
  browser.

To change the allowed domain, set `NEXT_PUBLIC_ALLOWED_DOMAIN` (or edit
`ALLOWED_DOMAIN` in `src/lib/constants.ts`).

## Scaling note

Google Sheets suits a department-scale inventory well. If data grows far beyond
that or needs heavy concurrent writes, swap `src/lib/googleSheets.ts` for a real
database — the API routes and the entire UI stay unchanged.
