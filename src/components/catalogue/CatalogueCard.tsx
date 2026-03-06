import { Package, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn, formatCurrency, formatLeadTime } from '../../lib/utils';
import { canAddToCart } from '../../lib/businessRules';
import type { CatalogueItem, PurchaseOrder } from '../../types';

interface Props {
  item: CatalogueItem;
  draft: PurchaseOrder | null;
  isAdding: boolean;
  onAdd: (item: CatalogueItem) => void;
}

export function CatalogueCard({ item, draft, isAdding, onAdd }: Props) {
  const blockReason = canAddToCart(item, draft);
  const alreadyInDraft = draft?.lineItems.some((l) => l.catalogueId === item.id) ?? false;
  const dimmed = blockReason === 'SUPPLIER_MISMATCH';

  const buttonConfig = (): { label: string; disabled: boolean; cls: string } => {
    if (alreadyInDraft)
      return { label: 'In Draft ✓', disabled: true, cls: 'bg-emerald-800/60 text-emerald-300 border-emerald-700 cursor-default' };
    if (blockReason === 'SUPPLIER_MISMATCH')
      return { label: 'Wrong Supplier', disabled: true, cls: 'bg-amber-900/50 text-amber-400 border-amber-700 cursor-not-allowed' };
    if (blockReason === 'OUT_OF_STOCK')
      return { label: 'Out of Stock', disabled: true, cls: 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed' };
    return { label: 'Add to Draft', disabled: false, cls: 'bg-amber-500 text-slate-900 border-amber-500 hover:bg-amber-400 cursor-pointer font-semibold' };
  };

  const btn = buttonConfig();

  return (
    <article
      className={cn(
        'flex flex-col rounded-lg border border-slate-700 bg-slate-800/60 p-4 transition-opacity',
        dimmed && 'opacity-40',
      )}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug text-slate-100">{item.name}</p>
          <p className="font-mono text-[11px] text-slate-500">{item.id}</p>
        </div>
        {item.inStock ? (
          <CheckCircle size={14} className="shrink-0 text-emerald-400" />
        ) : (
          <XCircle size={14} className="shrink-0 text-slate-600" />
        )}
      </div>

      {/* Meta */}
      <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div>
          <dt className="text-slate-500">Category</dt>
          <dd className="text-slate-300">{item.category}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Supplier</dt>
          <dd className="truncate text-slate-300">{item.supplier}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Manufacturer</dt>
          <dd className="text-slate-300">{item.manufacturer}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Model</dt>
          <dd className="truncate font-mono text-slate-300">{item.model}</dd>
        </div>
      </dl>

      {/* Price / lead time */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-700 pt-3">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Package size={11} />
            <span className="font-mono">{formatLeadTime(item.leadTimeDays)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            <span className="font-mono font-medium text-slate-200">{formatCurrency(item.priceUsd)}</span>
          </span>
        </div>

        <button
          disabled={btn.disabled || isAdding}
          onClick={() => !btn.disabled && onAdd(item)}
          className={cn(
            'rounded border px-2.5 py-1 text-[11px] transition-colors',
            btn.cls,
          )}
        >
          {isAdding && !btn.disabled ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            btn.label
          )}
        </button>
      </div>
    </article>
  );
}
