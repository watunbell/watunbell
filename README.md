# Department Inventory & Equipment Management System

A real-time inventory and equipment management system for a university academic
department, built with **Next.js (TypeScript)**, **Tailwind CSS**, and
**Google Firebase (Firestore)** for live data synchronization.

> This project lives on the `claude/university-inventory-system-*` branch. The
> repository's default branch hosts an unrelated project (Flow Cytometry
> Simulator); the leftover `index.html` at the repo root belongs to that
> project and is not used by this app.

## Features

- **Authentication** — Google sign-in restricted to the department's Google
  Workspace domain (`@g.swu.ac.th`). Enforced both client-side (sign-in gate +
  auto sign-out of other domains) and server-side (Firestore rules).
- **Real-time dashboard** — total inventory, low-stock alerts, and equipment
  status distribution, with a bar chart (category breakdown) and donut chart
  (status summary) that update live across all clients.
- **Inventory CRUD** — create, read, update, delete assets, with live search
  and category filtering.
- **Categorization** — Lab Equipment, Reagents/Chemicals (with expiry
  tracking), IT/Computing Devices, General Office Supplies.
- **Status tracking** — instant status updates for durable goods (ครุภัณฑ์):
  Available, In-Use/Borrowed, Maintenance/Broken, Retired.
- **Reporting export** — one-click CSV export (UTF-8 BOM, respects the active
  search/category filters) for faculty reporting. Import straight into Google
  Sheets via **File → Import → Upload**.

## Tech stack

| Layer         | Choice                                   |
| ------------- | ---------------------------------------- |
| Framework     | Next.js 14 (App Router, TypeScript)      |
| Styling / UI  | Tailwind CSS, lucide-react icons         |
| Data / realtime | Firebase Firestore (Web SDK, `onSnapshot`) |
| Charts        | Recharts                                 |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure Firebase
cp .env.example .env.local
#    …then fill in your Firebase web app credentials.

# 3. Run the dev server
npm run dev            # http://localhost:3000
```

### Enabling Google sign-in (one-time Firebase setup)

In the Firebase Console for your project:

1. **Authentication → Sign-in method →** enable **Google**.
2. **Authentication → Settings → Authorized domains →** add the domain the app
   runs on (`localhost` is there by default).
3. (Recommended) In Google Cloud Console, configure the OAuth consent screen as
   **Internal** for your `g.swu.ac.th` Workspace so only department accounts can
   even reach the consent screen.

The domain allow-list itself lives in code: `ALLOWED_DOMAIN` in
`src/lib/auth.ts` and the matching check in `firestore.rules`.

### Using the emulators (no cloud project needed)

```bash
# In .env.local set:
#   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
firebase emulators:start --only auth,firestore
npm run seed          # load sample data
npm run dev
# In the Auth emulator, create a test user with an @g.swu.ac.th email.
```

## Project structure

```
src/
  app/
    layout.tsx           # Root: AuthProvider + AppShell
    page.tsx             # Redirects to /dashboard
    dashboard/page.tsx   # Live stat cards + bar/donut charts
    inventory/page.tsx   # CRUD table, search/filter, CSV export
  components/
    AppShell.tsx         # Auth gate + sidebar/main chrome
    auth/                # SignInScreen
    inventory/           # ItemForm, StatusSelect, DeleteConfirm
    charts/              # CategoryBarChart, StatusDonutChart, ChartCard
    ui/                  # Modal, form fields
  context/AuthContext.tsx # Session state + domain enforcement
  hooks/useItems.ts      # Real-time Firestore subscription hook
  lib/
    firebase.ts          # Firebase app + Firestore + Auth init (+ emulators)
    auth.ts              # Google sign-in + @g.swu.ac.th domain check
    types.ts             # Domain model (mirrors the Firestore schema)
    constants.ts         # Categories, statuses, collection names
    items.ts             # CRUD, live listener, stats aggregation
    export.ts            # CSV report builder + download
    utils.ts             # Formatting + class-name helpers
scripts/seed.ts          # Sample-data seeder
docs/FIRESTORE_SCHEMA.md # Data model reference
firestore.rules          # Security rules (domain-restricted)
```

## Data model

See [`docs/FIRESTORE_SCHEMA.md`](docs/FIRESTORE_SCHEMA.md) for the full schema.
In short: a single `items` collection, discriminated by `category`, read via one
real-time snapshot listener that powers the whole dashboard.

## Security

Access is gated on two layers that must agree:

- **Client** — `AuthProvider` (`src/context/AuthContext.tsx`) only admits users
  whose Google account is on `@g.swu.ac.th`; anyone else is signed out
  immediately. This is UX, not the real boundary.
- **Server** — `firestore.rules` allows reads/writes only for a verified,
  domain-matching `request.auth` token, and shape-validates every write. This
  is the real boundary; deploy it with `firebase deploy --only firestore:rules`.

To change the allowed domain, update `ALLOWED_DOMAIN` in `src/lib/auth.ts` **and**
the matching pattern in `firestore.rules`.
