import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import type { POLineItem } from '../../types';

interface Props {
  item: POLineItem;
  onQuantityChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function LineItemRow({ item, onQuantityChange, onRemove, disabled }: Props) {
  return (
    <tr className="border-b border-slate-700/60 text-xs">
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-200">{item.name}</p>
        <p className="font-mono text-[11px] text-slate-500">{item.model}</p>
      </td>
      <td className="py-3 pr-4 text-right font-mono text-slate-300">
        {formatCurrency(item.unitPrice)}
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center justify-end gap-1">
          <button
            disabled={disabled || item.quantity <= 1}
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-600 text-slate-400 hover:border-amber-600 hover:text-amber-400 disabled:opacity-30"
          >
            <Minus size={10} />
          </button>
          <span className="w-8 text-center font-mono text-slate-200">{item.quantity}</span>
          <button
            disabled={disabled}
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-600 text-slate-400 hover:border-amber-600 hover:text-amber-400 disabled:opacity-30"
          >
            <Plus size={10} />
          </button>
        </div>
      </td>
      <td className="py-3 pr-4 text-right font-mono font-medium text-slate-100">
        {formatCurrency(item.lineTotal)}
      </td>
      <td className="py-3 text-right">
        <button
          disabled={disabled}
          onClick={() => onRemove(item.id)}
          className="text-slate-600 hover:text-red-400 disabled:opacity-30"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}
