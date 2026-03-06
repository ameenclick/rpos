import { Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { POHeader, POLineItem } from '../../types';

interface Props {
  header: POHeader;
  lineItems: POLineItem[];
  supplierName: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
  onEditItems: () => void;
  onEditHeader: () => void;
}

export function POReview({
  header,
  lineItems,
  supplierName,
  isSubmitting,
  submitError,
  onSubmit,
  onEditItems,
  onEditHeader,
}: Props) {
  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500">PO Header</p>
          <button onClick={onEditHeader} className="text-[11px] text-amber-500 hover:text-amber-300">
            Edit
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div><dt className="text-slate-500">Requestor</dt><dd className="text-slate-200">{header.requestor}</dd></div>
          <div><dt className="text-slate-500">Cost Center</dt><dd className="font-mono text-slate-200">{header.costCenter}</dd></div>
          <div><dt className="text-slate-500">Needed By</dt><dd className="font-mono text-slate-200">{formatDate(header.neededByDate)}</dd></div>
          <div><dt className="text-slate-500">Payment Terms</dt><dd className="text-slate-200">{header.paymentTerms}</dd></div>
          <div><dt className="text-slate-500">Supplier</dt><dd className="text-slate-200">{supplierName}</dd></div>
        </dl>
      </section>

      {/* Line items */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
            Line Items ({lineItems.length})
          </p>
          <button onClick={onEditItems} className="text-[11px] text-amber-500 hover:text-amber-300">
            Edit
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-left text-[11px] text-slate-500">
              <th className="pb-2 font-normal">Item</th>
              <th className="pb-2 text-right font-normal">Unit</th>
              <th className="pb-2 text-right font-normal">Qty</th>
              <th className="pb-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li) => (
              <tr key={li.id} className="border-b border-slate-700/40">
                <td className="py-2 pr-3">
                  <p className="text-slate-200">{li.name}</p>
                  <p className="font-mono text-[10px] text-slate-500">{li.model}</p>
                </td>
                <td className="py-2 pr-3 text-right font-mono text-slate-400">{formatCurrency(li.unitPrice)}</td>
                <td className="py-2 pr-3 text-right font-mono text-slate-300">{li.quantity}</td>
                <td className="py-2 text-right font-mono font-medium text-slate-100">{formatCurrency(li.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right text-[11px] text-slate-500">Subtotal</td>
              <td className="pt-3 text-right font-mono font-semibold text-amber-400">{formatCurrency(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Error */}
      {submitError && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-300">{submitError}</p>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isSubmitting ? 'Submitting…' : 'Submit PO'}
        </button>
      </div>
    </div>
  );
}
