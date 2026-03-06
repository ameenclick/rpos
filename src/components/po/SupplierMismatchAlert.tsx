import { XCircle } from 'lucide-react';

interface Props {
  currentSupplier: string;
  attemptedSupplier: string;
  onDismiss: () => void;
}

export function SupplierMismatchAlert({ currentSupplier, attemptedSupplier, onDismiss }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-700/60 bg-red-900/20 p-4">
      <XCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
      <div className="flex-1 text-xs text-red-300">
        <p className="font-semibold">Supplier mismatch</p>
        <p className="mt-0.5">
          This PO is locked to{' '}
          <span className="font-mono font-medium text-red-200">{currentSupplier}</span>. You attempted
          to add an item from{' '}
          <span className="font-mono font-medium text-red-200">{attemptedSupplier}</span>. Start a new
          draft to order from a different supplier.
        </p>
      </div>
      <button onClick={onDismiss} className="text-red-500 hover:text-red-300">
        <XCircle size={14} />
      </button>
    </div>
  );
}
