import { http, HttpResponse, delay } from 'msw';
import type { CatalogueItem, CatalogueListResponse } from '../../types';
import rawData from '../data/refinery_items_50_5suppliers_strict.json';

const catalogue = rawData as unknown as CatalogueItem[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomDelay(min: number, max: number) {
  return delay(Math.floor(Math.random() * (max - min + 1)) + min);
}

type SortKey = 'price_asc' | 'price_desc' | 'lead_time_low_high' | 'lead_time_high_low' | 'supplier_asc';

function sortItems(items: CatalogueItem[], sort: SortKey): CatalogueItem[] {
  const sorted = [...items];
  switch (sort) {
    case 'price_asc':         return sorted.sort((a, b) => a.priceUsd - b.priceUsd);
    case 'price_desc':        return sorted.sort((a, b) => b.priceUsd - a.priceUsd);
    case 'lead_time_low_high': return sorted.sort((a, b) => a.leadTimeDays - b.leadTimeDays);
    case 'lead_time_high_low': return sorted.sort((a, b) => b.leadTimeDays - a.leadTimeDays);
    case 'supplier_asc':
    default:                  return sorted.sort((a, b) => a.supplier.localeCompare(b.supplier));
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export const catalogueHandlers = [
  // GET /api/catalogue/categories — must be before /:id
  http.get('/api/catalogue/categories', async () => {
    await randomDelay(150, 250);
    const categories = [...new Set(catalogue.map((i) => i.category))].sort();
    return HttpResponse.json({ categories });
  }),

  // GET /api/catalogue/suppliers — must be before /:id
  http.get('/api/catalogue/suppliers', async () => {
    await randomDelay(150, 250);
    const suppliers = [...new Set(catalogue.map((i) => i.supplier))].sort();
    return HttpResponse.json({ suppliers });
  }),

  // GET /api/catalogue?q=&category=&inStock=&sort=&page=&pageSize=
  http.get('/api/catalogue', async ({ request }) => {
    await randomDelay(400, 800);

    const url = new URL(request.url);
    const q        = url.searchParams.get('q')?.toLowerCase() ?? '';
    const category = url.searchParams.get('category') ?? '';
    const inStock  = url.searchParams.get('inStock');
    const sort     = (url.searchParams.get('sort') ?? 'supplier_asc') as SortKey;
    const page     = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? '20'));

    let items = catalogue;

    if (q) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.supplier.toLowerCase().includes(q) ||
          i.manufacturer.toLowerCase().includes(q) ||
          i.model.toLowerCase().includes(q),
      );
    }

    if (category) {
      items = items.filter((i) => i.category === category);
    }

    if (inStock === 'true') {
      items = items.filter((i) => i.inStock);
    }

    items = sortItems(items, sort);

    const total      = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = items.slice(start, start + pageSize);

    const body: CatalogueListResponse = {
      items: paged,
      meta: { page, pageSize, total, totalPages },
    };

    return HttpResponse.json(body);
  }),

  // GET /api/catalogue/:id
  http.get('/api/catalogue/:id', async ({ params }) => {
    await randomDelay(150, 250);
    const item = catalogue.find((i) => i.id === params['id']);
    if (!item) {
      return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(item);
  }),
];
