import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { procurementService, type POListParams } from '../services/procurementService';
import { queryKeys } from '../lib/queryKeys';

export function usePOList(params: POListParams = {}) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(params as Record<string, unknown>),
    queryFn: () => procurementService.list(params),
  });
}

export function usePODetail(id: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: () => procurementService.get(id),
    enabled: Boolean(id),
  });
}

export function usePOTransition(poId: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.transition(poId),
    queryFn: () => procurementService.transition(poId),
    enabled: Boolean(poId),
  });
}

export function useApprovePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      procurementService.approve(id, notes),
    onSuccess: (po) => {
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(po.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}

export function useRejectPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      procurementService.reject(id, notes),
    onSuccess: (po) => {
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(po.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}

export function useFulfillPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      notes,
      deliveryReference,
    }: {
      id: string;
      notes?: string;
      deliveryReference?: string;
    }) => procurementService.fulfill(id, notes, deliveryReference),
    onSuccess: (po) => {
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(po.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}
