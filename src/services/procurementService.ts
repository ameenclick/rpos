import { apiClient } from './apiClient';
import { getIdempotencyKey, clearIdempotencyKey } from '../lib/idempotency';
import type {
  PurchaseOrder,
  POListResponse,
  POHeader,
  POTransitionStatus,
} from '../types';

/** Attach idempotency header and clear the key on success */
function withIdempotency(actionKey: string) {
  return { headers: { 'Idempotency-Key': getIdempotencyKey(actionKey) } };
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

export const procurementService = {
  // ── Queries ────────────────────────────────────────────────────────────────

  list: (params: POListParams) =>
    apiClient
      .get<POListResponse>('/purchase-orders', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<PurchaseOrder>(`/purchase-orders/${id}`)
      .then((r) => r.data),

  transition: (poId: string) =>
    apiClient
      .get<POTransitionStatus>(`/purchase-orders/transition`, { params: { poId } })
      .then((r) => r.data),

  // ── Draft mutations ────────────────────────────────────────────────────────

  createDraft: async (lineItems: Array<{ catalogueId: string; quantity: number }>) => {
    const key = 'create-draft';
    const res = await apiClient.post<PurchaseOrder>(
      '/purchase-orders/draft',
      { lineItems },
      withIdempotency(key),
    );
    committed(key);
    return res.data;
  },

  patchDraft: async (
    id: string,
    body: {
      header?: POHeader;
      updateLines?: Array<{ id: string; quantity: number }>;
      removeLines?: string[];
    },
  ) => {
    const key = `patch-draft-${id}`;
    const res = await apiClient.patch<PurchaseOrder>(
      `/purchase-orders/${id}/draft`,
      body,
      withIdempotency(key),
    );
    committed(key);
    return res.data;
  },

  deleteDraft: (id: string) =>
    apiClient.delete(`/purchase-orders/${id}/draft`),

  // ── Line mutations ─────────────────────────────────────────────────────────

  addLine: async (id: string, catalogueId: string, quantity: number) => {
    const key = `add-line-${id}-${catalogueId}`;
    const res = await apiClient.post<PurchaseOrder>(
      `/purchase-orders/${id}/lines`,
      { catalogueId, quantity },
      withIdempotency(key),
    );
    committed(key);
    return res.data;
  },

  removeLine: (poId: string, lineId: string) =>
    apiClient
      .delete<PurchaseOrder>(`/purchase-orders/${poId}/lines/${lineId}`)
      .then((r) => r.data),

  // ── Status transitions ─────────────────────────────────────────────────────

  submit: async (id: string) => {
    const key = `submit-${id}`;
    const res = await apiClient.post<PurchaseOrder>(
      `/purchase-orders/${id}/submit`,
      {},
      withIdempotency(key),
    );
    committed(key);
    return res.data;
  },

  approve: async (id: string, notes?: string) => {
    const key = `approve-${id}`;
    const res = await apiClient.post<PurchaseOrder>(
      `/purchase-orders/${id}/approve`,
      { notes },
      withIdempotency(key),
    );
    committed(key);
    return res.data;
  },

  reject: async (id: string, notes: string) => {
    const key = `reject-${id}`;
    const res = await apiClient.post<PurchaseOrder>(
      `/purchase-orders/${id}/reject`,
      { notes },
      withIdempotency(key),
    );
    committed(key);
    return res.data;
  },

  fulfill: async (id: string, notes?: string, deliveryReference?: string) => {
    const key = `fulfill-${id}`;
    const res = await apiClient.post<PurchaseOrder>(
      `/purchase-orders/${id}/fulfill`,
      { notes, deliveryReference },
      withIdempotency(key),
    );
    committed(key);
    return res.data;
  },
};
