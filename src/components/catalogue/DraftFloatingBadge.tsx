import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';
import type { POLineItem } from '../../types';

interface Props {
  supplierName: string;
  lineItems: POLineItem[];
}

export function DraftFloatingBadge({ supplierName, lineItems }: Props) {
  const navigate = useNavigate();
  const itemCount = lineItems.length;
  const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => void navigate('/po/draft')}
        className="flex items-center gap-3 rounded-xl border border-amber-600 bg-slate-900 px-4 py-3 shadow-2xl shadow-amber-900/30 transition-transform hover:-translate-y-0.5"
      >
        <ShoppingCart size={16} className="text-amber-400" />
        <div className="text-left">
          <p className="text-[11px] font-medium text-amber-400">{supplierName}</p>
          <p className="text-xs text-slate-200">
            <span className="font-mono font-semibold">{itemCount}</span>{' '}
            {itemCount === 1 ? 'item' : 'items'} ·{' '}
            <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
          </p>
        </div>
        <ArrowRight size={14} className="ml-1 text-amber-500" />
        <span className="sr-only">Review Draft</span>
      </button>
    </div>
  );
}
