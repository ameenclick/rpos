import { apiClient } from './apiClient';
import type { CatalogueItem, CatalogueListResponse } from '../types';

export interface CatalogueParams {
  q?: string;
  category?: string;
  inStock?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const catalogueService = {
  list: (params: CatalogueParams) =>
    apiClient
      .get<CatalogueListResponse>('/catalogue', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<CatalogueItem>(`/catalogue/${id}`)
      .then((r) => r.data),

  categories: () =>
    apiClient
      .get<{ categories: string[] }>('/catalogue/categories')
      .then((r) => r.data.categories),

  suppliers: () =>
    apiClient
      .get<{ suppliers: string[] }>('/catalogue/suppliers')
      .then((r) => r.data.suppliers),
};
