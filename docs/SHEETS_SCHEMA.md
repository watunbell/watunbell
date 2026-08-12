# Data Model — Google Sheet

The system uses a single Google Sheet as its database. The TypeScript types in
`src/lib/types.ts` mirror this layout, and `src/lib/googleSheets.ts` is the only
code that reads/writes the sheet.

## Layout

- **One tab** (worksheet), named `Items` by default (`GOOGLE_SHEETS_TAB`).
- **Row 1 is the header** — the exact column keys below, in order.
- **Each subsequent row is one item.** The `id` (column A) is a UUID assigned on
  create; rows with a blank `id` are ignored on read.

## Columns (A–T)

| Col | Key                    | Type / format        | Notes                                                        |
| --- | ---------------------- | --------------------- | ----------------------------------------------------------- |
| A   | `id`                   | UUID string          | Assigned server-side on create.                             |
| B   | `name`                 | string (required)    | Item name.                                                  |
| C   | `assetCode`            | string               | รหัสครุภัณฑ์, e.g. `SCI-CHEM-001`.                           |
| D   | `category`             | enum                 | `lab_equipment` \| `reagents_chemicals` \| `it_computing` \| `office_supplies` |
| E   | `description`          | string               |                                                             |
| F   | `quantity`             | number               | On-hand count.                                              |
| G   | `unit`                 | string               | e.g. `unit`, `box`, `bottle`, `ml`.                         |
| H   | `minQuantity`          | number               | Low-stock / reorder threshold (`quantity <= minQuantity`).  |
| I   | `status`               | enum                 | `available` \| `borrowed` \| `low` \| `broken` \| `disposal` \| `disposed` |
| J   | `location`             | string               | Room / cabinet / shelf.                                     |
| K   | `custodian`            | string               | ผู้ดูแล.                                                     |
| L   | `expiryDate`           | `YYYY-MM-DD`         | Meaningful for `reagents_chemicals`.                        |
| M   | `acquiredDate`         | `YYYY-MM-DD`         | Purchase / acquisition date.                                |
| N   | `unitPrice`            | number               | THB, for asset reporting.                                   |
| O   | `notes`                | string               |                                                             |
| P   | `createdAt`            | ISO 8601 datetime    | Set on create.                                              |
| Q   | `updatedAt`            | ISO 8601 datetime    | Set on every write.                                         |
| R   | `maintEnabled`         | `"true"` \| `""`     | Whether this item is on a maintenance/calibration schedule. |
| S   | `maintIntervalMonths`  | number                | Months between maintenance visits.                          |
| T   | `maintLastDate`        | `YYYY-MM-DD`          | Date of the last completed maintenance.                     |

## Loans tab (`Loans`)

The borrow/return audit trail lives in a second tab (auto-created on the first
borrow, or by the seed script). One row per loan event.

| Col | Key          | Type / format     | Notes                                              |
| --- | ------------ | ----------------- | -------------------------------------------------- |
| A   | `id`         | UUID string       | Loan id.                                           |
| B   | `itemId`     | UUID string       | References an `Items` row.                         |
| C   | `itemName`   | string            | Snapshot of the item name at borrow time.          |
| D   | `borrower`   | string            | Who physically holds the item.                     |
| E   | `quantity`   | number            | Units borrowed.                                    |
| F   | `borrowedAt` | `YYYY-MM-DD`      | When borrowed.                                     |
| G   | `dueDate`    | `YYYY-MM-DD`      | Expected return (optional).                         |
| H   | `returnedAt` | `YYYY-MM-DD`      | Set when returned.                                 |
| I   | `status`     | enum              | `active` \| `returned`.                            |
| J   | `recordedBy` | email             | **Signed-in staff who recorded the action** (audit). |
| K   | `notes`      | string            |                                                    |
| L   | `createdAt`  | ISO datetime      |                                                    |
| M   | `updatedAt`  | ISO datetime      |                                                    |

Borrowing appends an `active` loan **and** flips the item's `status` to
`borrowed`; returning sets `returnedAt`/`status = returned` **and** flips the
item back to `available`. Both sides are written server-side in one request
(`/api/loans`). `recordedBy` is taken from the authenticated session, so it
cannot be spoofed by the client.

## Access model

- **Reads/writes** go through the app's Next.js API routes (`/api/items`), which
  authenticate the caller (allowed-domain Google session) and then use a
  **service account** to talk to the sheet. End users never touch the sheet
  directly, so it does not need to be shared with them — only with the service
  account (as Editor).
- **Near real-time**: the client polls `/api/items` every ~4s and refreshes
  immediately after its own edits (`items:changed` event). This approximates
  Firebase's live listeners on top of a spreadsheet.

## Derived values (computed client-side, not stored)

- **Low stock**: `quantity <= minQuantity`.
- **Expiring soon**: `expiryDate` within `EXPIRING_SOON_DAYS` (default 30).
- **Next maintenance date**: `maintLastDate + maintIntervalMonths`, computed by
  `nextMaintDate()` in `src/lib/maintenance.ts`. Due/overdue flags use the
  dashboard's configurable warning lead time (default `DEFAULT_MAINT_WARN_DAYS`),
  stored client-side (see "Dashboard settings" below) — never in the sheet.
- **Dashboard aggregates**: `computeStats()` in `src/lib/items.ts`.

## Dashboard settings (client-side only, not in the sheet)

Chart visibility, the color palette, and the maintenance warning lead time are
per-browser UI preferences, not shared data — they're saved to
`localStorage` (see `src/lib/dashboardSettings.ts`) rather than the sheet.

## One-time setup

1. Create a Google Sheet; note its id from the URL
   (`/spreadsheets/d/<ID>/edit`).
2. In Google Cloud Console: enable the **Google Sheets API**, create a
   **service account**, and generate a JSON key.
3. **Share the sheet** with the service account's email as an **Editor**.
4. Put the credentials in `.env.local` (see `.env.example`).
5. `npm run seed` writes the header row and sample data.

## Scaling note

A spreadsheet is a great fit for a department-scale inventory (hundreds–low
thousands of rows). If it grows well beyond that, or needs heavy concurrent
writes, migrate `src/lib/googleSheets.ts` to a real database (e.g. Cloud SQL) —
the API routes and the entire UI stay unchanged.
