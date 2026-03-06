/**
 * Client-side idempotency key store.
 * Each action key maps to a stable UUID that is re-used on retries.
 * Clear the key only after the server confirms success.
 */
const cache = new Map<string, string>();

export function getIdempotencyKey(actionKey: string): string {
  if (!cache.has(actionKey)) {
    cache.set(actionKey, crypto.randomUUID());
  }
  return cache.get(actionKey)!;
}

export function clearIdempotencyKey(actionKey: string): void {
  cache.delete(actionKey);
}
