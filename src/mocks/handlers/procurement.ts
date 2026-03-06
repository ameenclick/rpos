import { http, HttpResponse, delay } from 'msw';
import { nanoid } from 'nanoid';
import type {
  PurchaseOrder,
  POLineItem,
  POListResponse,
  POTransitionStatus,
} from '../../types';
import type { CatalogueItem } from '../../types';
import { db, nextPoSequence, cacheIdempotent, getCachedIdempotent } from '../db';
import { generatePONumber } from '../../lib/poNumber';
import { isValidTransition } from '../../lib/businessRules';
import rawData from '../data/refinery_items_50_5suppliers_strict.json';

const catalogue = rawData as unknown as CatalogueItem[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomDelay(min: number, max: number) {
  return delay(Math.floor(Math.random() * (max - min + 1)) + min);
}

function now() {
  return new Date().toISOString();
}

function getCatalogueItem(id: string): CatalogueItem | undefined {
  return catalogue.find((i) => i.id === id);
}

/** Extract and validate the Idempotency-Key header; return 400 if absent */
function getIdempotencyHeader(request: Request): string | null {
  return request.headers.get('Idempotency-Key');
}

function getEnvBuyerId(): string {
  return import.meta.env['VITE_BUYER_ID'] ?? 'buyer-001';
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export const procurementHandlers = [

  // ── GET /api/purchase-orders/transition?poId=  (before /:id) ──────────────
  http.get('/api/purchase-orders/transition', async ({ request }) => {
    await randomDelay(150, 250);
    const poId = new URL(request.url).searchParams.get('poId') ?? '';
    const po = db.purchaseOrders.get(poId);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

    const allowed: Record<string, string[]> = {
      DRAFT:      ['SUBMITTED'],
      SUBMITTED:  ['APPROVED', 'REJECTED'],
      APPROVED:   ['FULFILLED'],
      REJECTED:   [],
      FULFILLED:  [],
    };

    const body: POTransitionStatus = {
      currentStatus: po.status,
      allowedTransitions: (allowed[po.status] ?? []) as POTransitionStatus['allowedTransitions'],
      lastEvent: po.statusTimeline.at(-1) ?? null,
    };
    return HttpResponse.json(body);
  }),

  // ── GET /api/purchase-orders ───────────────────────────────────────────────
  http.get('/api/purchase-orders', async ({ request }) => {
    await randomDelay(300, 400);
    const url        = new URL(request.url);
    const status     = url.searchParams.get('status') ?? '';
    const supplierId = url.searchParams.get('supplierId') ?? '';
    const page       = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize   = Math.max(1, Number(url.searchParams.get('pageSize') ?? '20'));

    let items = [...db.purchaseOrders.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (status) items = items.filter((p) => p.status === status);
    if (supplierId) items = items.filter((p) => p.supplierId === supplierId);

    const total      = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;

    const body: POListResponse = {
      items: items.slice(start, start + pageSize),
      meta: { page, pageSize, total, totalPages },
    };
    return HttpResponse.json(body);
  }),

  // ── GET /api/purchase-orders/:id ───────────────────────────────────────────
  http.get('/api/purchase-orders/:id', async ({ params }) => {
    await randomDelay(200, 300);
    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return HttpResponse.json(po);
  }),

  // ── POST /api/purchase-orders/draft ────────────────────────────────────────
  http.post('/api/purchase-orders/draft', async ({ request }) => {
    await randomDelay(400, 600);

    const iKey = getIdempotencyHeader(request);
    if (!iKey) return HttpResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 });

    const cached = getCachedIdempotent(iKey);
    if (cached !== null) return cached as Response;

    type Body = { lineItems: Array<{ catalogueId: string; quantity: number }> };
    const body = await request.json() as Body;
    const buyerId = getEnvBuyerId();

    // Validate first line item for supplier lock
    const firstItem = getCatalogueItem(body.lineItems[0]?.catalogueId ?? '');
    if (!firstItem) {
      return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }

    const lineItems: POLineItem[] = [];
    const poId = nanoid();

    for (const li of body.lineItems) {
      const item = getCatalogueItem(li.catalogueId);
      if (!item) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
      if (item.supplier !== firstItem.supplier) {
        return HttpResponse.json(
          { code: 'SUPPLIER_MISMATCH', currentSupplier: firstItem.supplier, attemptedSupplier: item.supplier },
          { status: 409 },
        );
      }
      lineItems.push({
        id: nanoid(),
        poId,
        catalogueId: item.id,
        supplierId: item.supplier,
        name: item.name,
        model: item.model,
        quantity: li.quantity,
        unitPrice: item.priceUsd,
        lineTotal: li.quantity * item.priceUsd,
        leadTimeDays: item.leadTimeDays,
      });
    }

    const ts = now();
    const po: PurchaseOrder = {
      id: poId,
      poNumber: null,
      buyerId,
      supplierId: firstItem.supplier,
      supplierName: firstItem.supplier,
      status: 'DRAFT',
      header: null,
      lineItems,
      statusTimeline: [
        { id: nanoid(), poId, fromStatus: null, toStatus: 'DRAFT', changedBy: buyerId, changedAt: ts },
      ],
      createdAt: ts,
      updatedAt: ts,
    };

    db.purchaseOrders.set(poId, po);
    const resp = HttpResponse.json(po, { status: 201 });
    cacheIdempotent(iKey, resp);
    return resp;
  }),

  // ── PATCH /api/purchase-orders/:id/draft ───────────────────────────────────
  http.patch('/api/purchase-orders/:id/draft', async ({ params, request }) => {
    await randomDelay(400, 600);

    const iKey = getIdempotencyHeader(request);
    if (!iKey) return HttpResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 });

    const cached = getCachedIdempotent(iKey);
    if (cached !== null) return cached as Response;

    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (po.status !== 'DRAFT') return HttpResponse.json({ code: 'NOT_DRAFT' }, { status: 409 });

    type PatchBody = {
      header?: PurchaseOrder['header'];
      updateLines?: Array<{ id: string; quantity: number }>;
      removeLines?: string[];
    };
    const body = await request.json() as PatchBody;

    if (body.header) po.header = body.header;

    if (body.updateLines) {
      for (const update of body.updateLines) {
        const li = po.lineItems.find((l) => l.id === update.id);
        if (li) {
          li.quantity  = update.quantity;
          li.lineTotal = update.quantity * li.unitPrice;
        }
      }
    }

    if (body.removeLines) {
      po.lineItems = po.lineItems.filter((l) => !body.removeLines!.includes(l.id));
    }

    po.updatedAt = now();
    db.purchaseOrders.set(po.id, po);

    // 202 Accepted (async processing pattern from spec)
    const resp = HttpResponse.json(po, { status: 202 });
    cacheIdempotent(iKey, resp);
    return resp;
  }),

  // ── DELETE /api/purchase-orders/:id/draft ──────────────────────────────────
  http.delete('/api/purchase-orders/:id/draft', async ({ params }) => {
    await randomDelay(200, 400);
    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (po.status !== 'DRAFT') return HttpResponse.json({ code: 'NOT_DRAFT' }, { status: 409 });
    db.purchaseOrders.delete(po.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── POST /api/purchase-orders/:id/lines ────────────────────────────────────
  http.post('/api/purchase-orders/:id/lines', async ({ params, request }) => {
    await randomDelay(300, 500);

    const iKey = getIdempotencyHeader(request);
    if (!iKey) return HttpResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 });

    const cached = getCachedIdempotent(iKey);
    if (cached !== null) return cached as Response;

    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (po.status !== 'DRAFT') return HttpResponse.json({ code: 'NOT_DRAFT' }, { status: 409 });

    type LineBody = { catalogueId: string; quantity: number };
    const body = await request.json() as LineBody;
    const item = getCatalogueItem(body.catalogueId);
    if (!item) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

    // Supplier enforcement
    if (po.lineItems.length > 0 && po.supplierId !== item.supplier) {
      return HttpResponse.json(
        { code: 'SUPPLIER_MISMATCH', currentSupplier: po.supplierId, attemptedSupplier: item.supplier },
        { status: 409 },
      );
    }

    // Update quantity if line already exists, else add new line
    const existing = po.lineItems.find((l) => l.catalogueId === item.id);
    if (existing) {
      existing.quantity  += body.quantity;
      existing.lineTotal  = existing.quantity * existing.unitPrice;
    } else {
      po.lineItems.push({
        id: nanoid(),
        poId: po.id,
        catalogueId: item.id,
        supplierId: item.supplier,
        name: item.name,
        model: item.model,
        quantity: body.quantity,
        unitPrice: item.priceUsd,
        lineTotal: body.quantity * item.priceUsd,
        leadTimeDays: item.leadTimeDays,
      });
      // Lock supplier on first line
      if (po.lineItems.length === 1) {
        po.supplierId   = item.supplier;
        po.supplierName = item.supplier;
      }
    }

    po.updatedAt = now();
    db.purchaseOrders.set(po.id, po);
    const resp = HttpResponse.json(po);
    cacheIdempotent(iKey, resp);
    return resp;
  }),

  // ── DELETE /api/purchase-orders/:id/lines/:lineId ──────────────────────────
  http.delete('/api/purchase-orders/:id/lines/:lineId', async ({ params }) => {
    await randomDelay(200, 350);
    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (po.status !== 'DRAFT') return HttpResponse.json({ code: 'NOT_DRAFT' }, { status: 409 });
    po.lineItems = po.lineItems.filter((l) => l.id !== params['lineId']);
    po.updatedAt = now();
    db.purchaseOrders.set(po.id, po);
    return HttpResponse.json(po);
  }),

  // ── POST /api/purchase-orders/:id/submit ───────────────────────────────────
  http.post('/api/purchase-orders/:id/submit', async ({ params, request }) => {
    await randomDelay(1200, 1500);

    const iKey = getIdempotencyHeader(request);
    if (!iKey) return HttpResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 });

    const cached = getCachedIdempotent(iKey);
    if (cached !== null) return cached as Response;

    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (!isValidTransition(po.status, 'SUBMITTED')) {
      return HttpResponse.json({ code: 'INVALID_TRANSITION' }, { status: 409 });
    }
    if (po.lineItems.length === 0 || !po.header) {
      return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'PO must have at least one line item and a completed header' }, { status: 422 });
    }

    // Re-snapshot prices and validate supplier consistency
    for (const li of po.lineItems) {
      const fresh = getCatalogueItem(li.catalogueId);
      if (!fresh) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
      if (fresh.supplier !== po.supplierId) {
        return HttpResponse.json(
          { code: 'SUPPLIER_MISMATCH', currentSupplier: po.supplierId, attemptedSupplier: fresh.supplier },
          { status: 409 },
        );
      }
      // Freeze prices at submission time
      li.unitPrice    = fresh.priceUsd;
      li.leadTimeDays = fresh.leadTimeDays;
      li.lineTotal    = li.quantity * li.unitPrice;
    }

    const buyerId = getEnvBuyerId();
    const seq     = nextPoSequence(po.supplierId);
    const ts      = now();

    po.status   = 'SUBMITTED';
    po.poNumber = generatePONumber(po.buyerId, po.supplierName, seq);
    po.statusTimeline.push({ id: nanoid(), poId: po.id, fromStatus: 'DRAFT', toStatus: 'SUBMITTED', changedBy: buyerId, changedAt: ts });
    po.updatedAt = ts;

    db.purchaseOrders.set(po.id, po);
    const resp = HttpResponse.json(po);
    cacheIdempotent(iKey, resp);
    return resp;
  }),

  // ── POST /api/purchase-orders/:id/approve ──────────────────────────────────
  http.post('/api/purchase-orders/:id/approve', async ({ params, request }) => {
    await randomDelay(500, 700);

    const iKey = getIdempotencyHeader(request);
    if (!iKey) return HttpResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 });

    const cached = getCachedIdempotent(iKey);
    if (cached !== null) return cached as Response;

    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (!isValidTransition(po.status, 'APPROVED')) {
      return HttpResponse.json({ code: 'INVALID_TRANSITION' }, { status: 409 });
    }

    type ApproveBody = { notes?: string };
    const body = await request.json() as ApproveBody;
    const actor = 'line-manager-001'; // simulated role
    const ts = now();

    po.status = 'APPROVED';
    po.statusTimeline.push({ id: nanoid(), poId: po.id, fromStatus: 'SUBMITTED', toStatus: 'APPROVED', changedBy: actor, changedAt: ts, notes: body.notes });
    po.updatedAt = ts;

    db.purchaseOrders.set(po.id, po);
    const resp = HttpResponse.json(po);
    cacheIdempotent(iKey, resp);
    return resp;
  }),

  // ── POST /api/purchase-orders/:id/reject ───────────────────────────────────
  http.post('/api/purchase-orders/:id/reject', async ({ params, request }) => {
    await randomDelay(500, 700);

    const iKey = getIdempotencyHeader(request);
    if (!iKey) return HttpResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 });

    const cached = getCachedIdempotent(iKey);
    if (cached !== null) return cached as Response;

    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (!isValidTransition(po.status, 'REJECTED')) {
      return HttpResponse.json({ code: 'INVALID_TRANSITION' }, { status: 409 });
    }

    type RejectBody = { notes: string };
    const body = await request.json() as RejectBody;
    if (!body.notes?.trim()) {
      return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Rejection notes are required' }, { status: 422 });
    }

    const actor = 'line-manager-001';
    const ts = now();

    po.status = 'REJECTED';
    po.statusTimeline.push({ id: nanoid(), poId: po.id, fromStatus: 'SUBMITTED', toStatus: 'REJECTED', changedBy: actor, changedAt: ts, notes: body.notes });
    po.updatedAt = ts;

    db.purchaseOrders.set(po.id, po);
    const resp = HttpResponse.json(po);
    cacheIdempotent(iKey, resp);
    return resp;
  }),

  // ── POST /api/purchase-orders/:id/fulfill ──────────────────────────────────
  http.post('/api/purchase-orders/:id/fulfill', async ({ params, request }) => {
    await randomDelay(500, 700);

    const iKey = getIdempotencyHeader(request);
    if (!iKey) return HttpResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 });

    const cached = getCachedIdempotent(iKey);
    if (cached !== null) return cached as Response;

    const po = db.purchaseOrders.get(params['id'] as string);
    if (!po) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (!isValidTransition(po.status, 'FULFILLED')) {
      return HttpResponse.json({ code: 'INVALID_TRANSITION' }, { status: 409 });
    }

    type FulfillBody = { notes?: string; deliveryReference?: string };
    const body = await request.json() as FulfillBody;
    const actor = 'procurement-manager-001';
    const ts = now();
    const notes = [body.notes, body.deliveryReference ? `Ref: ${body.deliveryReference}` : '']
      .filter(Boolean)
      .join(' — ') || undefined;

    po.status = 'FULFILLED';
    po.statusTimeline.push({ id: nanoid(), poId: po.id, fromStatus: 'APPROVED', toStatus: 'FULFILLED', changedBy: actor, changedAt: ts, notes });
    po.updatedAt = ts;

    db.purchaseOrders.set(po.id, po);
    const resp = HttpResponse.json(po);
    cacheIdempotent(iKey, resp);
    return resp;
  }),
];
