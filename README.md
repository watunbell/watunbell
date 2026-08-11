# Department Inventory & Equipment Management System

A real-time inventory and equipment management system for a university academic
department, built with **Next.js (TypeScript)**, **Tailwind CSS**, and
**Google Firebase (Firestore)** for live data synchronization.

> This project lives on the `claude/university-inventory-system-*` branch. The
> repository's default branch hosts an unrelated project (Flow Cytometry
> Simulator); the leftover `index.html` at the repo root belongs to that
> project and is not used by this app.

## Features (planned & in progress)

- **Real-time dashboard** — total inventory, low-stock alerts, and equipment
  status distribution, with bar charts (category breakdown) and donut charts
  (status summary) that update live across all clients. _(scaffolded; charts
  land next milestone)_
- **Inventory CRUD** — create, read, update, delete assets. _(read view live;
  full CRUD next milestone)_
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

### Using the Firestore emulator (no cloud project needed)

```bash
# In .env.local set:
#   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
firebase emulators:start --only firestore
npm run seed          # load sample data
npm run dev
```

## Project structure

```
src/
  app/
    layout.tsx           # App shell + sidebar
    page.tsx             # Redirects to /dashboard
    dashboard/page.tsx   # Live stats (charts coming next)
    inventory/page.tsx   # Item table (read view)
  components/            # Sidebar, StatCard, ConfigNotice, …
  hooks/useItems.ts      # Real-time Firestore subscription hook
  lib/
    firebase.ts          # Firebase app + Firestore init (+ emulator)
    types.ts             # Domain model (mirrors the Firestore schema)
    constants.ts         # Categories, statuses, collection names
    items.ts             # CRUD, live listener, stats aggregation
    utils.ts             # Formatting + class-name helpers
scripts/seed.ts          # Sample-data seeder
docs/FIRESTORE_SCHEMA.md # Data model reference
firestore.rules          # Security rules (dev-open; prod example inside)
```

## Data model

See [`docs/FIRESTORE_SCHEMA.md`](docs/FIRESTORE_SCHEMA.md) for the full schema.
In short: a single `items` collection, discriminated by `category`, read via one
real-time snapshot listener that powers the whole dashboard.

## Security

`firestore.rules` ships **development-open** so the app runs immediately. Before
any real deployment, switch to the authenticated production rules example
included (commented) in that file.
