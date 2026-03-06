// ─── Catalogue ───────────────────────────────────────────────────────────────

export interface CatalogueItem {
  id: string;
  name: string;
  category: string;
  supplier: string;
  manufacturer: string;
  model: string;
  priceUsd: number;
  leadTimeDays: number;
  inStock: boolean;
  specs: Record<string, string>;
  compatibleWith?: string[];
}

// ─── Purchase Order ──────────────────────────────────────────────────────────

export type POStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'FULFILLED';

export interface StatusEvent {
  id: string;
  poId: string;
  fromStatus: POStatus | null;
  toStatus: POStatus;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

export interface POLineItem {
  id: string;
  poId: string;
  catalogueId: string;
  supplierId: string;
  name: string;
  model: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  leadTimeDays: number;
}

export type PaymentTerms = 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60';

export interface POHeader {
  requestor: string;
  costCenter: string;
  neededByDate: string;
  paymentTerms: PaymentTerms;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string | null;
  buyerId: string;
  supplierId: string;
  supplierName: string;
  status: POStatus;
  header: POHeader | null;
  lineItems: POLineItem[];
  statusTimeline: StatusEvent[];
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CatalogueListResponse {
  items: CatalogueItem[];
  meta: PaginationMeta;
}

export interface POListResponse {
  items: PurchaseOrder[];
  meta: PaginationMeta;
}

export interface POTransitionStatus {
  currentStatus: POStatus;
  allowedTransitions: POStatus[];
  lastEvent: StatusEvent | null;
}

// ─── Supplier Mismatch Error Body ─────────────────────────────────────────────

export interface SupplierMismatchError {
  code: 'SUPPLIER_MISMATCH';
  currentSupplier: string;
  attemptedSupplier: string;
}
