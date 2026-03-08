import type {
  CatalogueItem,
  PurchaseOrder,
  POLineItem,
  POHeader,
  StatusEvent,
  POStatus,
  PaymentTerms,
} from '../types';

// ─── Raw row shapes returned by Supabase queries ────────────────────────────

/** catalogue row with joined supplier { name } */
interface CatalogueRow {
  id: number;
  supplier_id: number;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  price_usd: number;
  lead_time_days: number;
  in_stock: boolean;
  specifications: Record<string, string> | null;
  supplier: { name: string };
}

// ─── Catalogue ──────────────────────────────────────────────────────────────

export function mapCatalogueRow(row: CatalogueRow): CatalogueItem {
  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    supplier: row.supplier.name,
    manufacturer: row.manufacturer,
    model: row.model,
    priceUsd: row.price_usd,
    leadTimeDays: row.lead_time_days,
    inStock: row.in_stock,
    specs: row.specifications ?? {},
    compatibleWith: [],
  };
}

// ─── Purchase Order (from RPC jsonb) ────────────────────────────────────────
// The _build_po_response RPC already returns camelCase keys with bigint IDs
// cast to text, so the mapper only needs light type narrowing.

interface RpcLineItem {
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

interface RpcStatusEvent {
  id: string;
  poId: string;
  fromStatus: POStatus | null;
  toStatus: POStatus;
  changedBy: string;
  changedAt: string;
  notes: string | null;
}

interface RpcPurchaseOrder {
  id: string;
  poNumber: string;
  buyerId: string;
  supplierId: string;
  supplierName: string;
  status: POStatus;
  header: {
    requestor: string;
    costCenter: string;
    neededByDate: string;
    paymentTerms: PaymentTerms;
  } | null;
  lineItems: RpcLineItem[];
  statusTimeline: RpcStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export function mapPurchaseOrderRpc(rpc: RpcPurchaseOrder): PurchaseOrder {
  return {
    id: rpc.id,
    poNumber: rpc.poNumber,
    buyerId: rpc.buyerId,
    supplierId: rpc.supplierId,
    supplierName: rpc.supplierName,
    status: rpc.status,
    header: rpc.header ? mapHeader(rpc.header) : null,
    lineItems: rpc.lineItems.map(mapLineItem),
    statusTimeline: rpc.statusTimeline.map(mapStatusEvent),
    createdAt: rpc.createdAt,
    updatedAt: rpc.updatedAt,
  };
}

// ─── Header ─────────────────────────────────────────────────────────────────

function mapHeader(h: NonNullable<RpcPurchaseOrder['header']>): POHeader {
  return {
    requestor: h.requestor,
    costCenter: h.costCenter,
    neededByDate: h.neededByDate,
    paymentTerms: h.paymentTerms,
  };
}

// ─── Line Items ─────────────────────────────────────────────────────────────

function mapLineItem(li: RpcLineItem): POLineItem {
  return {
    id: li.id,
    poId: li.poId,
    catalogueId: li.catalogueId,
    supplierId: li.supplierId,
    name: li.name,
    model: li.model,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    lineTotal: li.lineTotal,
    leadTimeDays: li.leadTimeDays,
  };
}

// ─── Status Timeline ────────────────────────────────────────────────────────

function mapStatusEvent(ev: RpcStatusEvent): StatusEvent {
  return {
    id: ev.id,
    poId: ev.poId,
    fromStatus: ev.fromStatus,
    toStatus: ev.toStatus,
    changedBy: ev.changedBy,
    changedAt: ev.changedAt,
    notes: ev.notes ?? undefined,
  };
}
