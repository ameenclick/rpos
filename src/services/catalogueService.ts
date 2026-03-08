import { supabase } from '../lib/supabase';
import { mapCatalogueRow } from '../lib/supabaseMappers';
import type { CatalogueItem, CatalogueListResponse } from '../types';

export interface CatalogueParams {
  q?: string;
  category?: string;
  inStock?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

const CATALOGUE_SELECT = '*, supplier:supplier_id(name)' as const;

const SORT_MAP: Record<string, { column: string; ascending: boolean }[]> = {
  price_asc: [{ column: 'price_usd', ascending: true }],
  price_desc: [{ column: 'price_usd', ascending: false }],
  lead_time_low_high: [{ column: 'lead_time_days', ascending: true }],
  lead_time_high_low: [{ column: 'lead_time_days', ascending: false }],
  supplier_asc: [
    { column: 'supplier_id', ascending: true },
    { column: 'name', ascending: true },
  ],
};

export const catalogueService = {
  async list(params: CatalogueParams): Promise<CatalogueListResponse> {
    const {
      q,
      category,
      inStock,
      sort = 'supplier_asc',
      page = 1,
      pageSize = 20,
    } = params;

    let query = supabase
      .from('catalogue')
      .select(CATALOGUE_SELECT, { count: 'exact' });

    // Search across name, model, manufacturer via ilike.
    // The GIN index on the expression is available for direct SQL / RPC callers.
    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      query = query.or(
        `name.ilike.${term},model.ilike.${term},manufacturer.ilike.${term}`,
      );
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (inStock) {
      query = query.eq('in_stock', true);
    }

    for (const { column, ascending } of SORT_MAP[sort] ?? SORT_MAP.supplier_asc) {
      query = query.order(column, { ascending });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const total = count ?? 0;
    return {
      items: (data ?? []).map(mapCatalogueRow),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  async get(id: string): Promise<CatalogueItem> {
    const { data, error } = await supabase
      .from('catalogue')
      .select(CATALOGUE_SELECT)
      .eq('id', Number(id))
      .single();

    if (error) throw error;
    return mapCatalogueRow(data);
  },

  async categories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('catalogue')
      .select('category');

    if (error) throw error;
    return [...new Set((data ?? []).map((r: { category: string }) => r.category))].sort();
  },

  async suppliers(): Promise<string[]> {
    const { data, error } = await supabase
      .from('supplier')
      .select('name')
      .order('name');

    if (error) throw error;
    return (data ?? []).map((r: { name: string }) => r.name);
  },
};
