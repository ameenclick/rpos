/**
 * PO number generation — used server-side only (inside MSW handlers).
 * Pattern: PO-{BUYER_ID}-{SUPPLIER_SLUG}-{YYYY}-{ZERO_PADDED_SEQUENCE}
 * e.g. PO-BUYER001-FLOWSERVE-2024-0042
 */
export function generatePONumber(
  buyerId: string,
  supplierName: string,
  sequence: number,
): string {
  const year = new Date().getFullYear();
  const buyerSlug = buyerId.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const supplierSlug = supplierName
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
  const seq = String(sequence).padStart(4, '0');
  return `PO-${buyerSlug}-${supplierSlug}-${year}-${seq}`;
}
