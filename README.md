# Refinery Purchase Order System (RPOS)

A Buyer-facing procurement tool for refinery equipment. Built with React 19, Vite, TypeScript, Zustand, TanStack Query, and **Supabase** (PostgreSQL).

---

## Quick Start

### Prerequisites

- Node.js `>=22.12.0` (or `^20.19.0`)
- npm `>=10`
- A [Supabase](https://supabase.com) project (free tier works)

### Install

```bash
npm install
```

### Environment

Copy `.env` or create one at the project root:

```env
VITE_API_BASE_URL=/api
VITE_APP_NAME="Refinery PO System"
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_BUYER_ID=1
VITE_BUYER_NAME="Alex Morgan"
VITE_ENABLE_MSW=false
```

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project REST endpoint |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `VITE_BUYER_ID` | Seeded buyer ID (bigint as string) |
| `VITE_BUYER_NAME` | Display name for the active buyer |
| `VITE_ENABLE_MSW` | `true` to use in-memory MSW mocks instead of Supabase |

### Database Setup

Apply migrations and seed data to your Supabase project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then seed the database (1 buyer, 5 suppliers, 50 catalogue items):

```bash
npx supabase db execute --file supabase/seed.sql
```

Alternatively, paste each SQL file into the Supabase Dashboard **SQL Editor** in this order:

1. `supabase/migrations/001_initial_schema.sql` — tables, ENUM, trigger, RLS
2. `supabase/migrations/002_indexes.sql` — 22+ indexes
3. `supabase/migrations/003_rpc_functions.sql` — 10 RPCs + helper
4. `supabase/seed.sql` — initial data

### Dev Server

```bash
npm run dev
```

Open `http://localhost:5173`. The app connects directly to Supabase.

To fall back to the in-memory MSW mock backend, set `VITE_ENABLE_MSW=true` and run:

```bash
npx msw init public --save   # only needed once
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

---

## Architecture

```
src/
├── components/
│   ├── catalogue/          # CatalogueCard, FilterPanel, SortDropdown, DraftFloatingBadge
│   ├── layout/             # AppShell (page transitions, Toaster, draft restore), TopBar
│   ├── po/                 # LineItemRow, POHeaderForm, POReview, SupplierMismatchAlert
│   ├── status/             # StatusBadge, StatusTimeline
│   └── ui/                 # ConfirmDialog (Radix Dialog), Toaster (Radix Toast)
├── hooks/                  # TanStack Query hooks — all async data access lives here
├── lib/
│   ├── supabase.ts         # Supabase client init (createClient)
│   ├── supabaseMappers.ts  # snake_case→camelCase, bigint→string, header assembly
│   ├── idempotency.ts      # Client-side UUID key store for mutation safety
│   ├── businessRules.ts    # canAddToCart, isValidTransition, canSubmit
│   ├── queryKeys.ts        # TanStack Query cache key factories
│   ├── poNumber.ts         # PO number format reference (generation is DB-side)
│   └── utils.ts            # formatCurrency, formatDate, cn()
├── mocks/                  # MSW handlers + in-memory db (dev fallback)
├── pages/                  # CataloguePage, PODraftPage, POListPage, PODetailPage
├── schemas/                # Zod schemas: poHeaderSchema, lineItemSchema
├── services/
│   ├── catalogueService.ts # Supabase direct queries with nested selects
│   ├── procurementService.ts # Supabase queries (reads) + RPCs (mutations)
│   └── apiClient.ts        # Axios instance (only used when MSW fallback is active)
├── store/                  # Zustand: authStore, draftStore, toastStore
├── types/                  # Shared TypeScript interfaces (index.ts)
└── main.tsx                # Entrypoint — conditionally bootstraps MSW, then mounts React

supabase/
├── migrations/
│   ├── 001_initial_schema.sql  # 7 tables + ENUM + po_number trigger + RLS
│   ├── 002_indexes.sql         # 22+ indexes (B-Tree, GIN full-text, composite, partial)
│   └── 003_rpc_functions.sql   # 10 RPCs + _build_po_response helper
├── seed.sql                    # 1 buyer, 5 suppliers, 50 catalogue items, 5 sequences
└── config.toml                 # Supabase CLI project config
```

### Data Flow

**Supabase mode** (default):

```
Page / Component
  └─ TanStack Query hook       (src/hooks/)
       └─ Service function      (src/services/)
            ├─ Reads:  supabase.from().select()   → direct PostgREST queries
            └─ Writes: supabase.rpc()             → SECURITY DEFINER PostgreSQL functions
```

**MSW fallback** (`VITE_ENABLE_MSW=true`):

```
Page / Component
  └─ TanStack Query hook       (src/hooks/)
       └─ Axios service         (src/services/apiClient.ts)
            └─ MSW handler      (src/mocks/handlers/)
                 └─ In-memory DB (src/mocks/db.ts)
```

### Database Schema

```
buyer ─────────────┐
                    │
supplier ──┬───────┤
           │       │
catalogue ─┤       ├── purchase_order ──┬── po_line_items
           │       │                    │
           │       │                    └── po_status_timeline
           │       │
           └───────┴── po_sequences

idempotency_cache (standalone, TTL-based)
```

Key design points:
- **Bigint PKs** with `GENERATED ALWAYS AS IDENTITY`
- **Composite foreign keys** on `po_line_items` enforce single-supplier per PO at DB level
- **`line_total`** is `GENERATED ALWAYS AS (quantity * unit_price) STORED`
- **`po_number`** generated via `BEFORE INSERT` trigger using a per-supplier sequence
- **`po_status`** ENUM: `DRAFT → SUBMITTED → APPROVED → FULFILLED` (or `→ REJECTED`)
- **RLS enabled** on all tables — reads allowed for `anon`, writes via `SECURITY DEFINER` RPCs only

### RPC Functions

All mutations go through PostgreSQL functions to enforce business rules atomically:

| RPC | Purpose |
|---|---|
| `rpc_create_draft` | Create PO + line items, validate same supplier |
| `rpc_add_line` | UPSERT line to draft (increment qty if exists) |
| `rpc_update_line_qty` | Set quantity on existing line |
| `rpc_remove_line` | Delete line from draft |
| `rpc_delete_draft` | Delete entire draft PO (cascades) |
| `rpc_patch_draft_header` | Save cost_center, needed_by_date, payment_terms |
| `rpc_submit_po` | DRAFT → SUBMITTED (re-snapshots prices, validates header) |
| `rpc_approve_po` | SUBMITTED → APPROVED |
| `rpc_reject_po` | SUBMITTED → REJECTED (notes required) |
| `rpc_fulfill_po` | APPROVED → FULFILLED (combines delivery ref + notes) |

All idempotent RPCs check an `idempotency_cache` table before executing.

### State Layers

| Layer | Tool | Purpose |
|---|---|---|
| Server state | TanStack Query | Catalogue, PO list/detail, transitions |
| Draft (client) | Zustand + `persist` | Active draft — survives page refresh |
| Auth (client) | Zustand + `persist` | Buyer id/name seeded from env vars |
| Toasts | Zustand | Imperative `toast.success/error/info()` |

---

## Routes

| Path | Page | Description |
|---|---|---|
| `/` | → redirect | Redirects to `/catalogue` |
| `/catalogue` | `CataloguePage` | Search, filter, sort, add to draft |
| `/po/draft` | `PODraftPage` | 3-step wizard: items → header → review/submit |
| `/po` | `POListPage` | All POs with status badges |
| `/po/:id` | `PODetailPage` | PO detail, line items, status timeline, actions |

---

## Key Design Decisions

### Supabase as persistent backend
All data is stored in Supabase (PostgreSQL). The services layer uses `@supabase/supabase-js` for direct queries (reads) and `.rpc()` calls (mutations). MSW is preserved as an optional dev fallback controlled by `VITE_ENABLE_MSW`.

### Single-supplier enforcement — UI + DB
The supplier lock is enforced in `canAddToCart()` (client, prevents button activation), in the RPCs (server, raises exception), and via composite foreign keys on `po_line_items` (database, structurally impossible to violate).

### Requestor derived from buyer
The `requestor` field in the PO header is not stored as a separate column. It is derived from `buyer.name` via JOIN at read time, keeping the data normalized.

### PO number generated by DB trigger
`po_number` is generated on `INSERT` via a `BEFORE INSERT` trigger that increments a per-supplier sequence. Every PO — including drafts — gets a number at creation time.

### Idempotency key lifecycle
`getIdempotencyKey(actionKey)` creates a UUID per action and reuses it on retries. `clearIdempotencyKey(actionKey)` is called only after confirmed success. The key is passed as an RPC parameter; the server checks `idempotency_cache` and returns the cached response if found.

### Draft stored in Zustand, not only on the server
Supabase is the source of truth for the persisted PO. Zustand mirrors line items locally so the catalogue page and floating badge react instantly without a network round-trip. `setLineItems` is called from mutation `onSuccess` callbacks to keep both in sync.

### Frontend validation aligned with DB constraints
Zod schemas enforce `max()` lengths matching `varchar(N)` limits (e.g., `costCenter ≤ 100`). HTML `maxLength` attributes on textarea/input elements provide immediate feedback. RPCs also `RAISE` on overflow as a safety net.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Build | Vite 7 |
| Language | TypeScript (strict) |
| Backend | Supabase (PostgreSQL) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Forms | React Hook Form + Zod |
| UI primitives | Radix UI (Dialog, Toast, Select, Popover) |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Mock backend | MSW v2 (optional fallback) |
