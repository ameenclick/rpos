import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { POLineItem, POHeader } from '../types';

interface DraftState {
  /** Server-assigned PO id — set once the draft POST succeeds */
  poId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  lineItems: POLineItem[];
  header: POHeader | null;

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Called after a successful POST /draft — stores the returned PO id */
  initDraft: (poId: string, supplierId: string, supplierName: string) => void;

  setLineItems: (items: POLineItem[]) => void;
  setHeader: (header: POHeader) => void;

  /** Full reset — called after submit or explicit discard */
  clearDraft: () => void;
}

const emptyState = {
  poId: null,
  supplierId: null,
  supplierName: null,
  lineItems: [],
  header: null,
};

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      ...emptyState,

      initDraft: (poId, supplierId, supplierName) =>
        set({ poId, supplierId, supplierName }),

      setLineItems: (items) => set({ lineItems: items }),

      setHeader: (header) => set({ header }),

      clearDraft: () => set(emptyState),
    }),
    { name: 'rpos-draft' },
  ),
);
