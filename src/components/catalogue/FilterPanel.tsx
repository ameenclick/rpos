import { cn } from '../../lib/utils';

interface Props {
  categories: string[];
  selectedCategories: string[];
  inStock: boolean;
  onCategoryToggle: (cat: string) => void;
  onInStockToggle: () => void;
}

export function FilterPanel({
  categories,
  selectedCategories,
  inStock,
  onCategoryToggle,
  onInStockToggle,
}: Props) {
  return (
    <aside className="w-48 shrink-0 space-y-5">
      {/* In-stock toggle */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Availability
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <span
            role="checkbox"
            aria-checked={inStock}
            tabIndex={0}
            onClick={onInStockToggle}
            onKeyDown={(e) => e.key === 'Enter' && onInStockToggle()}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500',
              inStock ? 'bg-amber-500' : 'bg-slate-600',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform',
                inStock ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </span>
          In stock only
        </label>
      </div>

      {/* Category checkboxes */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Category
        </p>
        <ul className="space-y-1.5">
          {categories.map((cat) => {
            const checked = selectedCategories.includes(cat);
            return (
              <li key={cat}>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300 hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onCategoryToggle(cat)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-700 accent-amber-500"
                  />
                  {cat}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
