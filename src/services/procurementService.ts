import { supabase } from '../lib/supabase';
import { mapPurchaseOrderRpc } from '../lib/supabaseMappers';
import { getIdempotencyKey, clearIdempotencyKey } from '../lib/idempotency';
import { useAuthStore } from '../store/authStore';
import { isValidTransition } from '../lib/businessRules';
import type {
  PurchaseOrder,
  POListResponse,
  POHeader,
  POTransitionStatus,
  POStatus,
} from '../types';

function getBuyerId(): number {
  return Number(useAuthStore.getState().buyerId);
}

function idempotencyKey(actionKey: string) {
  return getIdempotencyKey(actionKey);
}

function committed(actionKey: string) {
  clearIdempotencyKey(actionKey);
}

export interface POListParams {
  status?: string;
  supplierId?: string;
  page?: number;
  pageSize?: number;
}

// Supabase nested-select string for purchase_order reads.
// Uses explicit FK constraint names to disambiguate composite FKs.
const PO_SELECT = `
  *,
  supplier:supplier_id(name),
  buyer:buyer_id(name),
  po_line_items!fk_line_po(
    *,
    catalogue!fk_line_catalogue(name, model, lead_time_days)
  ),
  po_status_timeline(*)
`;

/** Map a direct Supabase query row (snake_case, nested objects) to PurchaseOrder. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDirectRow(row: any): PurchaseOrder {
  const hasHeader =
    row.cost_center != null ||
    row.needed_by_date != null ||
    row.payment_terms != null;

  return {
    id: String(row.id),
    poNumber: row.po_number,
    buyerId: String(row.buyer_id),
    supplierId: String(row.supplier_id),
    supplierName: row.supplier?.name ?? '',
    status: row.status as POStatus,
    header: hasHeader
      ? {
          requestor: row.buyer?.name ?? '',
          costCenter: row.cost_center ?? '',
          neededByDate: row.needed_by_date ?? '',
          paymentTerms: row.payment_terms ?? 'Net 30',
        }
      : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lineItems: (row.po_line_items ?? []).map((li: any) => ({
      id: String(li.id),
      poId: String(li.po_id),
      catalogueId: String(li.catalogue_id),
      supplierId: String(li.supplier_id),
      name: li.catalogue?.name ?? '',
      model: li.catalogue?.model ?? '',
      quantity: li.quantity,
      unitPrice: li.unit_price,
      lineTotal: li.line_total,
      leadTimeDays: li.catalogue?.lead_time_days ?? 0,
    })),
    statusTimeline: (row.po_status_timeline ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) =>
        new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ev: any) => ({
        id: String(ev.id),
        poId: String(ev.po_id),
        fromStatus: ev.from_status as POStatus | null,
        toStatus: ev.to_status as POStatus,
        changedBy: String(ev.changed_by),
        changedAt: ev.changed_at,
        notes: ev.notes ?? undefined,
      })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const procurementService = {
  // ── Queries ────────────────────────────────────────────────────────────────

  async list(params: POListParams): Promise<POListResponse> {
    const { status, supplierId, page = 1, pageSize = 20 } = params;

    let query = supabase
      .from('purchase_order')
      .select(PO_SELECT, { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (supplierId) query = query.eq('supplier_id', Number(supplierId));

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const total = count ?? 0;
    return {
      items: (data ?? []).map(mapDirectRow),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  async get(id: string): Promise<PurchaseOrder> {
    const { data, error } = await supabase
      .from('purchase_order')
      .select(PO_SELECT)
      .eq('id', Number(id))
      .single();

    if (error) throw error;
    return mapDirectRow(data);
  },

  async transition(poId: string): Promise<POTransitionStatus> {
    const { data, error } = await supabase
      .from('purchase_order')
      .select('status, po_status_timeline(*)')
      .eq('id', Number(poId))
      .single();

    if (error) throw error;

    const currentStatus = data.status as POStatus;
    const allStatuses: POStatus[] = [
      'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FULFILLED',
    ];
    const allowedTransitions = allStatuses.filter((s) =>
      isValidTransition(currentStatus, s),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const timeline = (data.po_status_timeline ?? []).sort((a: any, b: any) =>
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
    );
    const last = timeline.at(-1);

    return {
      currentStatus,
      allowedTransitions,
      lastEvent: last
        ? {
            id: String(last.id),
            poId,
            fromStatus: last.from_status,
            toStatus: last.to_status,
            changedBy: String(last.changed_by),
            changedAt: last.changed_at,
            notes: last.notes ?? undefined,
          }
        : null,
    };
  },

  // ── Draft mutations ────────────────────────────────────────────────────────

  async createDraft(
    lineItems: Array<{ catalogueId: string; quantity: number }>,
  ): Promise<PurchaseOrder> {
    const key = 'create-draft';
    const { data, error } = await supabase.rpc('rpc_create_draft', {
      p_idempotency_key: idempotencyKey(key),
      p_buyer_id: getBuyerId(),
      p_line_items: lineItems.map((li) => ({
        catalogueId: li.catalogueId,
        quantity: li.quantity,
      })),
    });
    if (error) throw error;
    committed(key);
    return mapPurchaseOrderRpc(data);
  },

  async patchDraft(
    id: string,
    body: {
      header?: POHeader;
      updateLines?: Array<{ id: string; quantity: number }>;
      removeLines?: string[];
    },
  ): Promise<PurchaseOrder> {
    if (body.header) {
      const key = `patch-header-${id}`;
      const { data, error } = await supabase.rpc('rpc_patch_draft_header', {
        p_idempotency_key: idempotencyKey(key),
        p_po_id: Number(id),
        p_cost_center: body.header.costCenter,
        p_needed_by_date: body.header.neededByDate,
        p_payment_terms: body.header.paymentTerms,
      });
      if (error) throw error;
      committed(key);
      return mapPurchaseOrderRpc(data);
    }

    if (body.updateLines?.length) {
      const line = body.updateLines[0];
      const key = `update-line-${id}-${line.id}`;
      const { data, error } = await supabase.rpc('rpc_update_line_qty', {
        p_idempotency_key: idempotencyKey(key),
        p_po_id: Number(id),
        p_line_id: Number(line.id),
        p_quantity: line.quantity,
      });
      if (error) throw error;
      committed(key);
      return mapPurchaseOrderRpc(data);
    }

    return this.get(id);
  },

  async deleteDraft(id: string): Promise<void> {
    const { error } = await supabase.rpc('rpc_delete_draft', {
      p_po_id: Number(id),
    });
    if (error) throw error;
  },

  // ── Line mutations ─────────────────────────────────────────────────────────

  async addLine(
    id: string,
    catalogueId: string,
    quantity: number,
  ): Promise<PurchaseOrder> {
    const key = `add-line-${id}-${catalogueId}`;
    const { data, error } = await supabase.rpc('rpc_add_line', {
      p_idempotency_key: idempotencyKey(key),
      p_po_id: Number(id),
      p_catalogue_id: Number(catalogueId),
      p_quantity: quantity,
    });
    if (error) throw error;
    committed(key);
    return mapPurchaseOrderRpc(data);
  },

  async removeLine(poId: string, lineId: string): Promise<PurchaseOrder> {
    const { data, error } = await supabase.rpc('rpc_remove_line', {
      p_po_id: Number(poId),
      p_line_id: Number(lineId),
    });
    if (error) throw error;
    return mapPurchaseOrderRpc(data);
  },

  // ── Status transitions ─────────────────────────────────────────────────────

  async submit(id: string): Promise<PurchaseOrder> {
    const key = `submit-${id}`;
    const { data, error } = await supabase.rpc('rpc_submit_po', {
      p_idempotency_key: idempotencyKey(key),
      p_po_id: Number(id),
      p_buyer_id: getBuyerId(),
    });
    if (error) throw error;
    committed(key);
    return mapPurchaseOrderRpc(data);
  },

  async approve(id: string, notes?: string): Promise<PurchaseOrder> {
    const key = `approve-${id}`;
    const { data, error } = await supabase.rpc('rpc_approve_po', {
      p_idempotency_key: idempotencyKey(key),
      p_po_id: Number(id),
      p_actor: getBuyerId(),
      p_notes: notes ?? null,
    });
    if (error) throw error;
    committed(key);
    return mapPurchaseOrderRpc(data);
  },

  async reject(id: string, notes: string): Promise<PurchaseOrder> {
    const key = `reject-${id}`;
    const { data, error } = await supabase.rpc('rpc_reject_po', {
      p_idempotency_key: idempotencyKey(key),
      p_po_id: Number(id),
      p_actor: getBuyerId(),
      p_notes: notes,
    });
    if (error) throw error;
    committed(key);
    return mapPurchaseOrderRpc(data);
  },

  async fulfill(
    id: string,
    notes?: string,
    deliveryReference?: string,
  ): Promise<PurchaseOrder> {
    const key = `fulfill-${id}`;
    const { data, error } = await supabase.rpc('rpc_fulfill_po', {
      p_idempotency_key: idempotencyKey(key),
      p_po_id: Number(id),
      p_actor: getBuyerId(),
      p_notes: notes ?? null,
      p_delivery_ref: deliveryReference ?? null,
    });
    if (error) throw error;
    committed(key);
    return mapPurchaseOrderRpc(data);
  },
};
