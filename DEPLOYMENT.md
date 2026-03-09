# RPOS — Deployment & API Reference

> Companion document to [README.md](./README.md).
> Covers the **OpenAPI specification**, **AWS Amplify deployment**, **Supabase backend setup**, and a production-ready **.env template**.

---

## Table of Contents

1. [OpenAPI 3.0 Specification](#openapi-30-specification)
2. [Deploying Frontend to AWS Amplify](#deploying-frontend-to-aws-amplify)
3. [Deploying Backend to Supabase](#deploying-backend-to-supabase)
4. [Environment Variable Reference](#environment-variable-reference)
5. [Production Checklist](#production-checklist)

---

## OpenAPI 3.0 Specification

The app operates in two modes. In **Supabase mode** (production) the frontend calls PostgREST queries and `supabase.rpc()` directly — there is no custom backend server. In **MSW mode** (development fallback) the same operations are exposed as a conventional REST API via Mock Service Worker.

The specification below documents the **logical REST API surface** that the MSW handlers implement. Every endpoint maps 1 : 1 to a Supabase query or RPC.

```yaml
openapi: 3.0.3
info:
  title: RPOS — Refinery Purchase Order System API
  version: 1.0.0
  description: |
    Buyer-facing procurement API for refinery equipment.
    Production traffic goes through Supabase PostgREST + RPCs.
    This spec documents the equivalent REST surface used by the MSW dev mock.
  contact:
    name: RPOS Maintainers

servers:
  - url: /api
    description: Local dev (MSW fallback)
  - url: https://<project-ref>.supabase.co/rest/v1
    description: Supabase PostgREST (production reads)
  - url: https://<project-ref>.supabase.co/rest/v1/rpc
    description: Supabase RPCs (production mutations)

tags:
  - name: Catalogue
    description: Browse and search refinery equipment catalogue
  - name: Purchase Orders
    description: CRUD and lifecycle transitions for purchase orders
  - name: Lines
    description: Manage line items on a draft purchase order
  - name: Transitions
    description: Status workflow — submit, approve, reject, fulfill

# ═══════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════
paths:

  # ─── Catalogue ────────────────────────────────────────────
  /catalogue:
    get:
      operationId: listCatalogue
      summary: List catalogue items (paginated, filterable, sortable)
      tags: [Catalogue]
      parameters:
        - name: q
          in: query
          schema: { type: string }
          description: Free-text search across name, model, manufacturer, and numeric ID
        - name: category
          in: query
          schema: { type: string }
          description: Exact category filter
        - name: inStock
          in: query
          schema: { type: boolean }
          description: When true, only items currently in stock
        - name: sort
          in: query
          schema:
            type: string
            enum: [price_asc, price_desc, lead_time_low_high, lead_time_high_low, supplier_asc]
            default: supplier_asc
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/pageSize'
      responses:
        '200':
          description: Paginated catalogue listing
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CatalogueListResponse'

  /catalogue/categories:
    get:
      operationId: listCategories
      summary: Distinct category values
      tags: [Catalogue]
      responses:
        '200':
          description: Sorted array of unique category strings
          content:
            application/json:
              schema:
                type: object
                properties:
                  categories:
                    type: array
                    items: { type: string }

  /catalogue/suppliers:
    get:
      operationId: listSuppliers
      summary: All supplier names (alphabetical)
      tags: [Catalogue]
      responses:
        '200':
          description: Sorted array of supplier names
          content:
            application/json:
              schema:
                type: object
                properties:
                  suppliers:
                    type: array
                    items: { type: string }

  /catalogue/{id}:
    get:
      operationId: getCatalogueItem
      summary: Single catalogue item by ID
      tags: [Catalogue]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Catalogue item
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CatalogueItem'
        '404':
          $ref: '#/components/responses/NotFound'

  # ─── Purchase Orders ──────────────────────────────────────
  /purchase-orders:
    get:
      operationId: listPurchaseOrders
      summary: List purchase orders (paginated, filterable by status/supplier)
      tags: [Purchase Orders]
      parameters:
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/POStatus'
        - name: supplierId
          in: query
          schema: { type: string }
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/pageSize'
      responses:
        '200':
          description: Paginated PO list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/POListResponse'

  /purchase-orders/transition:
    get:
      operationId: getTransitionStatus
      summary: Allowed status transitions for a PO
      tags: [Transitions]
      parameters:
        - name: poId
          in: query
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Current status and allowed transitions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/POTransitionStatus'
        '404':
          $ref: '#/components/responses/NotFound'

  /purchase-orders/{id}:
    get:
      operationId: getPurchaseOrder
      summary: Full purchase order with lines, header, timeline
      tags: [Purchase Orders]
      parameters:
        - $ref: '#/components/parameters/poId'
      responses:
        '200':
          description: Complete purchase order
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'

  /purchase-orders/draft:
    post:
      operationId: createDraft
      summary: Create a new DRAFT purchase order with initial line items
      tags: [Purchase Orders]
      description: |
        All catalogue items must belong to the same supplier.
        Maps to Supabase RPC `rpc_create_draft`.
      parameters:
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [lineItems]
              properties:
                lineItems:
                  type: array
                  minItems: 1
                  items:
                    type: object
                    required: [catalogueId, quantity]
                    properties:
                      catalogueId:
                        type: string
                      quantity:
                        type: integer
                        minimum: 1
      responses:
        '201':
          description: Draft PO created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/SupplierMismatch'

  /purchase-orders/{id}/draft:
    patch:
      operationId: patchDraft
      summary: Update header fields or line quantities on a DRAFT PO
      tags: [Purchase Orders]
      description: |
        Accepts partial updates.  Send `header` to save header fields, or
        `updateLines` / `removeLines` to modify individual line items.
        Maps to Supabase RPCs `rpc_patch_draft_header` / `rpc_update_line_qty`.
      parameters:
        - $ref: '#/components/parameters/poId'
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                header:
                  $ref: '#/components/schemas/POHeader'
                updateLines:
                  type: array
                  items:
                    type: object
                    required: [id, quantity]
                    properties:
                      id:
                        type: string
                      quantity:
                        type: integer
                        minimum: 1
                removeLines:
                  type: array
                  items: { type: string }
      responses:
        '202':
          description: Draft updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: PO is not in DRAFT status
    delete:
      operationId: deleteDraft
      summary: Delete an entire DRAFT purchase order
      tags: [Purchase Orders]
      description: Maps to Supabase RPC `rpc_delete_draft`.
      parameters:
        - $ref: '#/components/parameters/poId'
      responses:
        '204':
          description: Draft deleted
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: PO is not in DRAFT status

  # ─── Line Items ───────────────────────────────────────────
  /purchase-orders/{id}/lines:
    post:
      operationId: addLine
      summary: Add a catalogue item to a DRAFT PO (upserts quantity)
      tags: [Lines]
      description: |
        If the item already exists on the PO, its quantity is incremented.
        Maps to Supabase RPC `rpc_add_line`.
      parameters:
        - $ref: '#/components/parameters/poId'
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [catalogueId, quantity]
              properties:
                catalogueId:
                  type: string
                quantity:
                  type: integer
                  minimum: 1
      responses:
        '200':
          description: Updated PO with new/updated line
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/SupplierMismatch'

  /purchase-orders/{id}/lines/{lineId}:
    delete:
      operationId: removeLine
      summary: Remove a line item from a DRAFT PO
      tags: [Lines]
      description: Maps to Supabase RPC `rpc_remove_line`.
      parameters:
        - $ref: '#/components/parameters/poId'
        - name: lineId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Updated PO without the deleted line
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: PO is not in DRAFT status

  # ─── Status Transitions ──────────────────────────────────
  /purchase-orders/{id}/submit:
    post:
      operationId: submitPO
      summary: "DRAFT → SUBMITTED"
      tags: [Transitions]
      description: |
        Re-snapshots catalogue prices before finalising.
        Requires a completed header and at least one line item.
        Maps to Supabase RPC `rpc_submit_po`.
      parameters:
        - $ref: '#/components/parameters/poId'
        - $ref: '#/components/parameters/IdempotencyKey'
      responses:
        '200':
          description: PO submitted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: Invalid transition (PO is not DRAFT)
        '422':
          description: Missing header or line items

  /purchase-orders/{id}/approve:
    post:
      operationId: approvePO
      summary: "SUBMITTED → APPROVED"
      tags: [Transitions]
      description: Maps to Supabase RPC `rpc_approve_po`.
      parameters:
        - $ref: '#/components/parameters/poId'
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                notes:
                  type: string
                  maxLength: 255
      responses:
        '200':
          description: PO approved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: Invalid transition (PO is not SUBMITTED)

  /purchase-orders/{id}/reject:
    post:
      operationId: rejectPO
      summary: "SUBMITTED → REJECTED"
      tags: [Transitions]
      description: Rejection notes are **required**. Maps to Supabase RPC `rpc_reject_po`.
      parameters:
        - $ref: '#/components/parameters/poId'
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [notes]
              properties:
                notes:
                  type: string
                  minLength: 1
                  maxLength: 255
      responses:
        '200':
          description: PO rejected
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: Invalid transition (PO is not SUBMITTED)
        '422':
          description: Notes are required for rejection

  /purchase-orders/{id}/fulfill:
    post:
      operationId: fulfillPO
      summary: "APPROVED → FULFILLED"
      tags: [Transitions]
      description: |
        Optionally attach a delivery reference and notes.
        Maps to Supabase RPC `rpc_fulfill_po`.
      parameters:
        - $ref: '#/components/parameters/poId'
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                notes:
                  type: string
                deliveryReference:
                  type: string
      responses:
        '200':
          description: PO fulfilled
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PurchaseOrder'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: Invalid transition (PO is not APPROVED)

# ═══════════════════════════════════════════════════════════════
# COMPONENTS
# ═══════════════════════════════════════════════════════════════
components:

  parameters:
    page:
      name: page
      in: query
      schema: { type: integer, minimum: 1, default: 1 }
    pageSize:
      name: pageSize
      in: query
      schema: { type: integer, minimum: 1, default: 20 }
    poId:
      name: id
      in: path
      required: true
      schema: { type: string }
      description: Purchase order ID (bigint as string)
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: true
      schema: { type: string, format: uuid }
      description: Client-generated UUID for safe retries

  responses:
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              code: { type: string, example: NOT_FOUND }
    SupplierMismatch:
      description: Line items belong to different suppliers
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/SupplierMismatchError'

  schemas:

    # ── Catalogue ───────────────────────────────────────────
    CatalogueItem:
      type: object
      properties:
        id:            { type: string }
        name:          { type: string }
        category:      { type: string }
        supplier:      { type: string, description: Supplier name (resolved from FK) }
        manufacturer:  { type: string }
        model:         { type: string }
        priceUsd:      { type: number, description: Price in USD cents (integer) }
        leadTimeDays:  { type: integer }
        inStock:       { type: boolean }
        specs:         { type: object, additionalProperties: { type: string } }

    CatalogueListResponse:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/CatalogueItem'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    # ── Purchase Order ──────────────────────────────────────
    POStatus:
      type: string
      enum: [DRAFT, SUBMITTED, APPROVED, REJECTED, FULFILLED]

    PaymentTerms:
      type: string
      enum: ['Net 15', 'Net 30', 'Net 45', 'Net 60']

    POHeader:
      type: object
      required: [requestor, costCenter, neededByDate, paymentTerms]
      properties:
        requestor:     { type: string, minLength: 2, maxLength: 255 }
        costCenter:    { type: string, minLength: 1, maxLength: 100 }
        neededByDate:  { type: string, format: date, description: Must be a future date }
        paymentTerms:  { $ref: '#/components/schemas/PaymentTerms' }

    POLineItem:
      type: object
      properties:
        id:            { type: string }
        poId:          { type: string }
        catalogueId:   { type: string }
        supplierId:    { type: string }
        name:          { type: string }
        model:         { type: string }
        quantity:      { type: integer, minimum: 1 }
        unitPrice:     { type: number }
        lineTotal:     { type: number, description: "Generated: quantity × unitPrice" }
        leadTimeDays:  { type: integer }

    StatusEvent:
      type: object
      properties:
        id:         { type: string }
        poId:       { type: string }
        fromStatus: { $ref: '#/components/schemas/POStatus', nullable: true }
        toStatus:   { $ref: '#/components/schemas/POStatus' }
        changedBy:  { type: string }
        changedAt:  { type: string, format: date-time }
        notes:      { type: string, nullable: true }

    PurchaseOrder:
      type: object
      properties:
        id:              { type: string }
        poNumber:        { type: string, nullable: true, description: "Generated on INSERT by DB trigger. Pattern: {buyer_id}-PO-{supplier_id}-{yyyy}-PO-{seq}" }
        buyerId:         { type: string }
        supplierId:      { type: string }
        supplierName:    { type: string }
        status:          { $ref: '#/components/schemas/POStatus' }
        header:          { $ref: '#/components/schemas/POHeader', nullable: true }
        lineItems:
          type: array
          items:
            $ref: '#/components/schemas/POLineItem'
        statusTimeline:
          type: array
          items:
            $ref: '#/components/schemas/StatusEvent'
        createdAt:       { type: string, format: date-time }
        updatedAt:       { type: string, format: date-time }

    POListResponse:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/PurchaseOrder'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    POTransitionStatus:
      type: object
      properties:
        currentStatus:      { $ref: '#/components/schemas/POStatus' }
        allowedTransitions:
          type: array
          items:
            $ref: '#/components/schemas/POStatus'
        lastEvent:
          $ref: '#/components/schemas/StatusEvent'
          nullable: true

    PaginationMeta:
      type: object
      properties:
        page:       { type: integer }
        pageSize:   { type: integer }
        total:      { type: integer }
        totalPages: { type: integer }

    SupplierMismatchError:
      type: object
      properties:
        code:              { type: string, enum: [SUPPLIER_MISMATCH] }
        currentSupplier:   { type: string }
        attemptedSupplier: { type: string }
```

### RPC-to-REST Mapping

| Supabase RPC | REST Equivalent | HTTP |
|---|---|---|
| `supabase.from('catalogue').select(...)` | `GET /catalogue` | — |
| `supabase.from('catalogue').select('category')` | `GET /catalogue/categories` | — |
| `supabase.from('supplier').select('name')` | `GET /catalogue/suppliers` | — |
| `supabase.from('purchase_order').select(...)` | `GET /purchase-orders` | — |
| `supabase.from('purchase_order').select(...).eq('id', id)` | `GET /purchase-orders/:id` | — |
| `rpc_create_draft` | `POST /purchase-orders/draft` | `201` |
| `rpc_patch_draft_header` / `rpc_update_line_qty` | `PATCH /purchase-orders/:id/draft` | `202` |
| `rpc_delete_draft` | `DELETE /purchase-orders/:id/draft` | `204` |
| `rpc_add_line` | `POST /purchase-orders/:id/lines` | `200` |
| `rpc_remove_line` | `DELETE /purchase-orders/:id/lines/:lineId` | `200` |
| `rpc_submit_po` | `POST /purchase-orders/:id/submit` | `200` |
| `rpc_approve_po` | `POST /purchase-orders/:id/approve` | `200` |
| `rpc_reject_po` | `POST /purchase-orders/:id/reject` | `200` |
| `rpc_fulfill_po` | `POST /purchase-orders/:id/fulfill` | `200` |

### Status Machine

```
         ┌──────────┐
         │  DRAFT   │
         └────┬─────┘
              │ submit
         ┌────▼─────┐
         │SUBMITTED │
         └──┬────┬──┘
   approve  │    │  reject
       ┌────▼┐ ┌─▼──────┐
       │APPR.│ │REJECTED│
       └──┬──┘ └────────┘
          │ fulfill
    ┌─────▼────┐
    │FULFILLED │
    └──────────┘
```

---

## Deploying Frontend to AWS Amplify

AWS Amplify hosts the Vite SPA and deploys automatically from a GitHub branch.

### Prerequisites

- An **AWS account** with Amplify access
- The repository pushed to **GitHub**
- A configured **Supabase project** (see next section)

### Step-by-Step

#### 1. Connect the Repository

1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify/).
2. Click **Create new app** → **GitHub**.
3. Authorize AWS Amplify to access your GitHub account.
4. Select the `rpos` repository and the branch to deploy (e.g. `main`).

#### 2. Configure Build Settings

Amplify auto-detects Vite projects. Verify or replace the build spec with:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

> If Amplify does not pick up the correct Node version, add `nvm use 22` (or `20`) to the top of `preBuild` commands, or set the build image to `Amazon Linux 2023` which ships Node 22.

#### 3. Set Environment Variables

In the Amplify console navigate to **App settings → Environment variables** and add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) key |
| `VITE_BUYER_ID` | `1` |
| `VITE_BUYER_NAME` | `Alex Morgan` |
| `VITE_ENABLE_MSW` | `false` |
| `VITE_APP_NAME` | `Refinery PO System` |

> `VITE_API_BASE_URL` is not needed in Supabase mode.

#### 4. SPA Redirects

Amplify must rewrite all paths to `index.html` for client-side routing. Add a redirect rule under **App settings → Rewrites and redirects** (or in `amplify.yml`):

| Source | Target | Type |
|---|---|---|
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

This ensures routes like `/catalogue`, `/po/draft`, `/po/123` resolve correctly.

#### 5. Custom Domain (Optional)

1. Go to **App settings → Domain management**.
2. Add your domain and follow the DNS verification steps.
3. Amplify provisions a free SSL certificate via ACM.

#### 6. Deploy

Push to the connected branch — Amplify triggers a build automatically. Monitor the build under the **Build** tab in the console.

### Amplify CLI Alternative

```bash
npm install -g @aws-amplify/cli
amplify init
amplify add hosting
amplify publish
```

---

## Deploying Backend to Supabase

The backend is entirely Supabase-hosted: a PostgreSQL database with RLS policies, 10 SECURITY DEFINER RPCs, a trigger for PO number generation, and 22+ indexes.

### Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm i -g supabase`)

### Step-by-Step

#### 1. Create a Supabase Project

1. Log in at [app.supabase.com](https://app.supabase.com).
2. Click **New Project**.
3. Choose an organization, name the project (e.g. `rpos`), set a strong database password, and select a region close to your Amplify region.
4. Wait for provisioning to complete (~2 minutes).

#### 2. Link the CLI

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

`<your-project-ref>` is the alphanumeric ID visible in the Supabase dashboard URL (e.g. `abcdefghijkl`).

#### 3. Apply Migrations

```bash
npx supabase db push
```

This executes the three migration files in order:

| File | What It Creates |
|---|---|
| `001_initial_schema.sql` | 7 tables, `po_status` ENUM, PO number trigger, RLS policies |
| `002_indexes.sql` | 22+ indexes (B-Tree, GIN full-text, composite, partial) |
| `003_rpc_functions.sql` | 10 RPCs + `_build_po_response` helper |

#### 4. Seed the Database

```bash
npx supabase db execute --file supabase/seed.sql
```

This creates:
- 1 buyer (`Alex Morgan`)
- 5 suppliers with CR numbers
- 50 catalogue items across categories
- 5 PO sequence counters

#### 5. Retrieve Credentials

From the Supabase dashboard go to **Settings → API**:

| Credential | Where to Use |
|---|---|
| **Project URL** | `VITE_SUPABASE_URL` |
| **anon / public key** | `VITE_SUPABASE_ANON_KEY` |

> The `anon` key is safe to embed in the frontend — RLS and SECURITY DEFINER RPCs protect all writes.

#### 6. Verify RLS Policies

All tables have RLS enabled. Confirm in **Authentication → Policies** or via SQL:

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: `SELECT` granted to `anon` on `buyer`, `supplier`, `catalogue`, `purchase_order`, `po_line_items`, `po_status_timeline`. No direct `INSERT` / `UPDATE` / `DELETE` policies — mutations go through RPCs.

#### 7. (Optional) Enable Realtime

If you want live PO status updates:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_order;
ALTER PUBLICATION supabase_realtime ADD TABLE po_status_timeline;
```

#### 8. (Optional) Edge Functions

Not currently needed. All business logic runs inside PostgreSQL functions.

---

## Environment Variable Reference

### `.env` Template (Production — AWS Amplify)

```env
# ── Supabase ──────────────────────────────────────────
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# ── Application ───────────────────────────────────────
VITE_APP_NAME="Refinery PO System"
VITE_BUYER_ID=1
VITE_BUYER_NAME="Alex Morgan"

# ── Feature Flags ─────────────────────────────────────
VITE_ENABLE_MSW=false

# ── Not needed in production (Supabase mode) ──────────
# VITE_API_BASE_URL=/api
```

### `.env` Template (Local Development — MSW mode)

```env
# ── MSW mock backend (no Supabase needed) ─────────────
VITE_ENABLE_MSW=true
VITE_API_BASE_URL=/api

# ── Application ───────────────────────────────────────
VITE_APP_NAME="Refinery PO System"
VITE_BUYER_ID=1
VITE_BUYER_NAME="Alex Morgan"

# ── Supabase (not used when MSW is active) ────────────
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=placeholder
```

### Variable Matrix

| Variable | Required | Default | Used In | Notes |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes (prod) | — | `lib/supabase.ts` | Supabase project REST endpoint |
| `VITE_SUPABASE_ANON_KEY` | Yes (prod) | — | `lib/supabase.ts` | Public API key (safe for browser) |
| `VITE_BUYER_ID` | No | `buyer-001` | `store/authStore.ts` | Must match a seeded buyer row ID |
| `VITE_BUYER_NAME` | No | `Alex Morgan` | `store/authStore.ts` | Display name for the active buyer |
| `VITE_ENABLE_MSW` | No | `false` | `main.tsx` | `true` enables MSW mock backend |
| `VITE_API_BASE_URL` | No | `/api` | `services/apiClient.ts` | Only relevant when MSW is active |
| `VITE_APP_NAME` | No | — | UI reference | Application display name |

---

## Production Checklist

- [ ] **Supabase project** created and migrations applied (`db push`)
- [ ] **Seed data** loaded (`seed.sql`)
- [ ] **RLS policies** verified (all 6 `SELECT` policies active, no direct write policies)
- [ ] **RPCs** available — test with `supabase functions list` or the SQL editor
- [ ] **Amplify app** created and connected to GitHub
- [ ] **Build spec** configured (`dist` as artifact directory, `npm ci && npm run build`)
- [ ] **Environment variables** set in Amplify (all `VITE_*` keys)
- [ ] **SPA redirect** rule added (rewrite to `/index.html`)
- [ ] **VITE_ENABLE_MSW** set to `false` in production
- [ ] **Custom domain** configured with SSL (optional)
- [ ] **CORS** — Supabase allows all origins by default; restrict in production under **Settings → API → CORS Allowed Origins**
- [ ] **Database password** stored securely (never committed to repo)
- [ ] **Idempotency cache cleanup** — consider a scheduled function to purge expired rows:
  ```sql
  DELETE FROM idempotency_cache WHERE expires_at < now();
  ```
