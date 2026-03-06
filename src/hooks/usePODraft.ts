import { useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementService } from '../services/procurementService';
import { useDraftStore } from '../store/draftStore';
import { queryKeys } from '../lib/queryKeys';
import type { POHeader } from '../types';

/** Add an item to the active draft, creating the draft PO if one doesn't exist yet */
export function useAddToDraft() {
  const { poId, initDraft, setLineItems } = useDraftStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ catalogueId, quantity }: { catalogueId: string; quantity: number }) => {
      if (poId) {
        // Draft already exists — add the line
        return procurementService.addLine(poId, catalogueId, quantity);
      }
      // First item — create the draft
      return procurementService.createDraft([{ catalogueId, quantity }]);
    },
    onSuccess: (po) => {
      if (!poId) initDraft(po.id, po.supplierId, po.supplierName);
      setLineItems(po.lineItems);
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}

/** Update the quantity of a line item in the active draft */
export function useUpdateDraftLine() {
  const { poId, setLineItems } = useDraftStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) => {
      if (!poId) throw new Error('No active draft');
      return procurementService.patchDraft(poId, { updateLines: [{ id: lineId, quantity }] });
    },
    onSuccess: (po) => {
      setLineItems(po.lineItems);
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(po.id) });
    },
  });
}

/** Remove a line item from the active draft */
export function useRemoveDraftLine() {
  const { poId, setLineItems } = useDraftStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (lineId: string) => {
      if (!poId) throw new Error('No active draft');
      return procurementService.removeLine(poId, lineId);
    },
    onSuccess: (po) => {
      setLineItems(po.lineItems);
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(po.id) });
    },
  });
}

/** Save the PO header on the active draft */
export function useSaveDraftHeader() {
  const { poId, setHeader } = useDraftStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (header: POHeader) => {
      if (!poId) throw new Error('No active draft');
      return procurementService.patchDraft(poId, { header });
    },
    onSuccess: (po) => {
      if (po.header) setHeader(po.header);
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(po.id) });
    },
  });
}

/** Discard the active draft entirely */
export function useDiscardDraft() {
  const { poId, clearDraft } = useDraftStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!poId) throw new Error('No active draft');
      return procurementService.deleteDraft(poId);
    },
    onSuccess: () => {
      clearDraft();
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}

/** Submit the active draft PO */
export function useSubmitDraft() {
  const { poId, clearDraft } = useDraftStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!poId) throw new Error('No active draft');
      return procurementService.submit(poId);
    },
    onSuccess: (po) => {
      clearDraft();
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(po.id) });
    },
  });
}
