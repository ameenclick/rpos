import type { PurchaseOrder } from '../types';

interface IdempotencyCacheEntry {
  response: unknown;
  expiresAt: number;
}

/** In-memory store — resets on every page reload (MSW worker restart) */
export const db = {
  purchaseOrders: new Map<string, PurchaseOrder>(),
  idempotencyCache: new Map<string, IdempotencyCacheEntry>(),

  /** Sequence counter per supplier slug used to generate PO numbers */
  poSequence: new Map<string, number>(),
};

/** Returns the next sequence number for a given supplier slug */
export function nextPoSequence(supplierSlug: string): number {
  const current = db.poSequence.get(supplierSlug) ?? 0;
  const next = current + 1;
  db.poSequence.set(supplierSlug, next);
  return next;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Cache a response under an idempotency key */
export function cacheIdempotent(key: string, response: unknown): void {
  db.idempotencyCache.set(key, {
    response,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}

/** Return a cached response if the key exists and has not expired */
export function getCachedIdempotent(key: string): unknown | null {
  const entry = db.idempotencyCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    db.idempotencyCache.delete(key);
    return null;
  }
  return entry.response;
}
