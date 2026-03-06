import type { CatalogueItem, POStatus, PurchaseOrder } from '../types';

/**
 * Whether a catalogue item can be added to the given draft.
 * Returns null if allowed; returns a reason string if blocked.
 */
export function canAddToCart(
  item: CatalogueItem,
  draft: PurchaseOrder | null,
): null | 'OUT_OF_STOCK' | 'SUPPLIER_MISMATCH' | 'NOT_DRAFT' {
  if (!item.inStock) return 'OUT_OF_STOCK';
  if (!draft) return null;
  if (draft.status !== 'DRAFT') return 'NOT_DRAFT';
  // Supplier lock: first line item fixes the supplier for the whole PO
  if (draft.lineItems.length > 0 && draft.supplierId !== item.supplier) {
    return 'SUPPLIER_MISMATCH';
  }
  return null;
}

/** Whether the given status transition is valid per domain rules */
export function isValidTransition(from: POStatus, to: POStatus): boolean {
  const allowed: Record<POStatus, POStatus[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'REJECTED'],
    APPROVED: ['FULFILLED'],
    REJECTED: [],
    FULFILLED: [],
  };
  return allowed[from].includes(to);
}

/** Whether a draft PO is ready to be submitted */
export function canSubmit(po: PurchaseOrder): boolean {
  return (
    po.status === 'DRAFT' &&
    po.lineItems.length > 0 &&
    po.header !== null
  );
}
