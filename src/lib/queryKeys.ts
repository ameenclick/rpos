/** Typed TanStack Query key factories — one source of truth for cache keys */

export const queryKeys = {
  // Catalogue
  catalogue: {
    all: ['catalogue'] as const,
    list: (params: Record<string, unknown>) => ['catalogue', 'list', params] as const,
    detail: (id: string) => ['catalogue', 'detail', id] as const,
    categories: ['catalogue', 'categories'] as const,
    suppliers: ['catalogue', 'suppliers'] as const,
  },

  // Purchase orders
  purchaseOrders: {
    all: ['purchase-orders'] as const,
    list: (params: Record<string, unknown>) => ['purchase-orders', 'list', params] as const,
    detail: (id: string) => ['purchase-orders', 'detail', id] as const,
    transition: (poId: string) => ['purchase-orders', 'transition', poId] as const,
  },
} as const;
