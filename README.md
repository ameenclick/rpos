# Refinery Purchase Order System (RPOS)

A Buyer-facing procurement tool for refinery equipment. Built with React 19, Vite, TypeScript, Zustand, TanStack Query, and MSW.

---

## Quick Start

### Prerequisites

- Node.js `>=22.12.0` (or `^20.19.0`)
- npm `>=10`

### Install

```bash
npm install
npx msw init public --save   # only needed once — generates public/mockServiceWorker.js
```

### Environment

Copy `.env` or create one at the project root:

```env
VITE_API_BASE_URL=/api
VITE_APP_NAME="Refinery PO System"
VITE_BUYER_ID=buyer-001
VITE_BUYER_NAME="Alex Morgan"
VITE_ENABLE_MSW=true
```

All variables are prefixed `VITE_` and inlined at build time by Vite.

### Dev server

```bash
npm run dev
```

Open `http://localhost:5173`. MSW will intercept all `/api/*` requests in the browser.

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
│   ├── layout/             # AppShell (page transitions, Toaster, draft restore notice), TopBar
│   ├── po/                 # LineItemRow, POHeaderForm, POReview, SupplierMismatchAlert
│   ├── status/             # StatusBadge, StatusTimeline
│   └── ui/                 # ConfirmDialog (Radix Dialog), Toaster (Radix Toast)
├── hooks/                  # TanStack Query hooks — all async data access lives here
├── lib/                    # Pure utilities: utils, queryKeys, idempotency, poNumber, businessRules
├── mocks/                  # MSW handlers (catalogue + procurement), in-memory db, browser worker
├── pages/                  # CataloguePage, PODraftPage, POListPage, PODetailPage
├── schemas/                # Zod schemas for PO header and line item forms
├── services/               # Thin Axios wrappers (apiClient, catalogueService, procurementService)
├── store/                  # Zustand: authStore, draftStore, toastStore
├── types/                  # Shared TypeScript interfaces (index.ts)
└── main.tsx                # Entrypoint — bootstraps MSW then mounts React
```

### Data flow

```
Page / Component
  └─ TanStack Query hook  (src/hooks/)
       └─ Axios service   (src/services/)
            └─ MSW handler (src/mocks/handlers/)
                 └─ In-memory Map DB (src/mocks/db.ts)
```

### State layers

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

## Key Design Decisions & Trade-offs

### Single-supplier enforcement — UI + MSW
The supplier lock is enforced in **both** `canAddToCart()` (client, prevents button activation) and the MSW handler (server, returns 409). Neither side is the sole guardian. This matches the system spec requiring dual enforcement.

### MSW as the only backend
All data lives in an in-memory `Map` inside the MSW service worker. State resets on every page reload. There is no persistence beyond what Zustand writes to `localStorage` (the active draft only). This is intentional for a demo — a real backend would replace the MSW handlers with no other code changes.

### Axios over `fetch`
Axios was chosen because the idempotency header and typed response pattern is already wired per-service via `withIdempotency()`. Switching to `fetch` would require rebuilding the same wrapper surface.

### Draft stored in Zustand, not only on the server
The server (MSW) is the source of truth for the persisted PO. Zustand mirrors line items locally so the catalogue page and floating badge can react instantly without a network round-trip. `setLineItems` is called from mutation `onSuccess` callbacks to keep both in sync.

### Zod schemas reused across forms and handlers
`poHeaderSchema` and `lineItemSchema` in `src/schemas/` are imported by both `react-hook-form` resolvers and (in principle) MSW handlers, ensuring client validation mirrors server validation without duplication.

### PO number generated server-side only
`generatePONumber()` is in `src/lib/poNumber.ts` but is only called from the MSW `submit` handler, never from any component. This enforces the rule: never generate `poNumber` on the frontend.

### Idempotency key lifecycle
`getIdempotencyKey(actionKey)` creates a UUID per action and reuses it on retries. `clearIdempotencyKey(actionKey)` is called only after a confirmed success response. If a mutation fails mid-flight, the same key is used on retry so the server can return the cached response without double-executing side effects.

---

## Deliverables Checklist

- [x] Vite + React 19 + TypeScript scaffolded with strict mode
- [x] MSW v2 handlers for all endpoints in the spec with simulated delays
- [x] 50-item JSON dataset loaded and served via mock catalogue handlers
- [x] CataloguePage: search + filter + sort + URL param sync + skeleton loading
- [x] Zustand draft store with `persist` middleware + restore-on-load toast
- [x] Supplier enforcement: UI dim + 409 mock + blocking `SupplierMismatchAlert`
- [x] Line management: add, update quantity, remove, live subtotal
- [x] PODraftPage: 3-step wizard (items → header → review/submit)
- [x] POListPage: table with status badges + empty state
- [x] PODetailPage: line items + status timeline with actor names
- [x] Status transition actions (Approve / Reject with notes Dialog / Fulfill)
- [x] Industrial UI theme: IBM Plex Mono + DM Sans + amber/slate palette
- [x] Idempotency key pattern on all mutating requests
- [x] All TypeScript strict, zero `any`
- [x] README: setup instructions + architecture decisions + known trade-offs
