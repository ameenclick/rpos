import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, AlertCircle } from 'lucide-react';
import type { AxiosError } from 'axios';
import { useCatalogueList, useCatalogueCategories } from '../hooks/useCatalogue';
import { useAddToDraft } from '../hooks/usePODraft';
import { useDraftStore } from '../store/draftStore';
import { usePODetail } from '../hooks/usePurchaseOrders';
import { CatalogueCard } from '../components/catalogue/CatalogueCard';
import { FilterPanel } from '../components/catalogue/FilterPanel';
import { SortDropdown, type SortValue } from '../components/catalogue/SortDropdown';
import { DraftFloatingBadge } from '../components/catalogue/DraftFloatingBadge';
import { SupplierMismatchAlert } from '../components/po/SupplierMismatchAlert';
import type { CatalogueItem, SupplierMismatchError } from '../types';

// ─── Skeleton ────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-3 h-4 w-3/4 rounded bg-slate-700" />
      <div className="mb-1 h-3 w-1/3 rounded bg-slate-700" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 rounded bg-slate-700" />
        ))}
      </div>
      <div className="mt-4 h-7 rounded bg-slate-700" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync state from URL params
  const [query, setQuery]           = useState(searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ] = useState(query);
  const [sort, setSort]             = useState<SortValue>(
    (searchParams.get('sort') as SortValue) ?? 'supplier_asc',
  );
  const [selectedCats, setSelectedCats] = useState<string[]>(
    searchParams.get('category')?.split(',').filter(Boolean) ?? [],
  );
  const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<SupplierMismatchError | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Keep URL params in sync
  useEffect(() => {
    const params: Record<string, string> = { sort };
    if (debouncedQ) params['q'] = debouncedQ;
    if (selectedCats.length) params['category'] = selectedCats.join(',');
    if (inStock) params['inStock'] = 'true';
    setSearchParams(params, { replace: true });
  }, [debouncedQ, sort, selectedCats, inStock, setSearchParams]);

  const catalogueParams = {
    q: debouncedQ || undefined,
    category: selectedCats[0] ?? undefined, // handler supports one category at a time
    inStock: inStock || undefined,
    sort,
    pageSize: 50,
  };

  const { data, isLoading, isError } = useCatalogueList(catalogueParams);
  const { data: categories = [] }    = useCatalogueCategories();

  // Draft state
  const { poId, supplierId, supplierName, lineItems } = useDraftStore();
  const { data: draftPO } = usePODetail(poId ?? '');
  const activeDraft = draftPO ?? null;

  const addToDraft = useAddToDraft();

  const handleAdd = useCallback(async (item: CatalogueItem) => {
    setAddingId(item.id);
    setMismatch(null);
    try {
      await addToDraft.mutateAsync({ catalogueId: item.id, quantity: 1 });
    } catch (err) {
      const axErr = err as AxiosError<SupplierMismatchError & { code: string }>;
      if (axErr.response?.data?.code === 'SUPPLIER_MISMATCH') {
        setMismatch(axErr.response.data);
      }
    } finally {
      setAddingId(null);
    }
  }, [addToDraft]);

  const toggleCategory = (cat: string) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );

  return (
    <div className="flex gap-6">
      {/* Filters */}
      <FilterPanel
        categories={categories}
        selectedCategories={selectedCats}
        inStock={inStock}
        onCategoryToggle={toggleCategory}
        onInStockToggle={() => setInStock((v) => !v)}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, ID, supplier, model…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <SortDropdown value={sort} onChange={setSort} />
        </div>

        {/* Supplier lock notice */}
        {supplierId && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
            <AlertCircle size={13} />
            <span>
              Draft locked to <span className="font-semibold">{supplierName}</span>. Items from other
              suppliers are dimmed.
            </span>
          </div>
        )}

        {/* Supplier mismatch alert (from API 409) */}
        {mismatch && (
          <div className="mb-3">
            <SupplierMismatchAlert
              currentSupplier={mismatch.currentSupplier}
              attemptedSupplier={mismatch.attemptedSupplier}
              onDismiss={() => setMismatch(null)}
            />
          </div>
        )}

        {/* Error */}
        {isError && (
          <p className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-300">
            Failed to load catalogue. Please try again.
          </p>
        )}

        {/* Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? [...Array(9)].map((_, i) => <CardSkeleton key={i} />)
            : data?.items?.map((item) => (
                <CatalogueCard
                  key={item.id}
                  item={item}
                  draft={activeDraft}
                  isAdding={addingId === item.id}
                  onAdd={handleAdd}
                />
              ))}
        </div>

        {/* Empty */}
        {!isLoading && data?.items.length === 0 && (
          <p className="mt-8 text-center text-xs text-slate-500">
            No items match your filters.
          </p>
        )}

        {/* Count */}
        {!isLoading && (data?.meta.total ?? 0) > 0 && (
          <p className="mt-4 text-right text-[11px] text-slate-600">
            {data?.meta.total} items
          </p>
        )}
      </div>

      {/* Floating draft badge */}
      {lineItems.length > 0 && supplierName && (
        <DraftFloatingBadge supplierName={supplierName} lineItems={lineItems} />
      )}
    </div>
  );
}

export default CataloguePage;
