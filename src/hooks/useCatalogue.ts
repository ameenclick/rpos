import { useQuery } from '@tanstack/react-query';
import { catalogueService, type CatalogueParams } from '../services/catalogueService';
import { queryKeys } from '../lib/queryKeys';

export function useCatalogueList(params: CatalogueParams) {
  return useQuery({
    queryKey: queryKeys.catalogue.list(params as Record<string, unknown>),
    queryFn: () => catalogueService.list(params),
  });
}

export function useCatalogueItem(id: string) {
  return useQuery({
    queryKey: queryKeys.catalogue.detail(id),
    queryFn: () => catalogueService.get(id),
    enabled: Boolean(id),
  });
}

export function useCatalogueCategories() {
  return useQuery({
    queryKey: [...queryKeys.catalogue.categories],
    queryFn: () => catalogueService.categories(),
    staleTime: Infinity, // categories rarely change within a session
  });
}

export function useCatalogueSuppliers() {
  return useQuery({
    queryKey: [...queryKeys.catalogue.suppliers],
    queryFn: () => catalogueService.suppliers(),
    staleTime: Infinity,
  });
}
