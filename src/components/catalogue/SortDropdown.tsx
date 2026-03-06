import { ChevronDown } from 'lucide-react';

export const SORT_OPTIONS = [
  { value: 'supplier_asc',       label: 'Supplier A → Z' },
  { value: 'price_asc',          label: 'Price Low → High' },
  { value: 'price_desc',         label: 'Price High → Low' },
  { value: 'lead_time_low_high', label: 'Lead Time Low → High' },
  { value: 'lead_time_high_low', label: 'Lead Time High → Low' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

interface Props {
  value: SortValue;
  onChange: (v: SortValue) => void;
}

export function SortDropdown({ value, onChange }: Props) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortValue)}
        className="appearance-none rounded-md border border-slate-600 bg-slate-800 py-1.5 pl-3 pr-8 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 text-slate-400" />
    </div>
  );
}
