import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useDraftStore } from '../store/draftStore';
import {
  useUpdateDraftLine,
  useRemoveDraftLine,
  useSaveDraftHeader,
  useSubmitDraft,
  useDiscardDraft,
} from '../hooks/usePODraft';
import { LineItemRow } from '../components/po/LineItemRow';
import { POHeaderForm } from '../components/po/POHeaderForm';
import { POReview } from '../components/po/POReview';
import { formatCurrency } from '../lib/utils';
import type { AxiosError } from 'axios';
import { toast } from '../store/toastStore';

type Step = 1 | 2 | 3;

// ── Step indicator ─────────────────────────────────────────────────────────
function WizardSteps({ current }: { current: Step }) {
  const steps = ['Line Items', 'PO Header', 'Review & Submit'] as const;
  return (
    <div className="mb-8 flex items-center gap-0">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold
                  ${active ? 'bg-amber-500 text-slate-900' : done ? 'bg-emerald-700 text-emerald-200' : 'bg-slate-700 text-slate-500'}`}
              >
                {done ? '✓' : n}
              </span>
              <span
                className={`text-xs font-medium ${active ? 'text-amber-400' : done ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {label}
              </span>
            </div>
            {i < 2 && <div className="mx-3 h-px w-10 bg-slate-700" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyDraft() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <ShoppingCart size={32} className="text-slate-600" />
      <p className="text-sm text-slate-400">Your draft is empty.</p>
      <Link
        to="/catalogue"
        className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400"
      >
        Browse Catalogue
      </Link>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
function PODraftPage() {
  const navigate = useNavigate();
  const [step, setStep]             = useState<Step>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const { poId, supplierId, supplierName, lineItems, header } = useDraftStore();

  const updateLine   = useUpdateDraftLine();
  const removeLine   = useRemoveDraftLine();
  const saveHeader   = useSaveDraftHeader();
  const submitDraft  = useSubmitDraft();
  const discardDraft = useDiscardDraft();

  const handleUpdateQty = useCallback((id: string, qty: number) => {
    updateLine.mutate(
      { lineId: id, quantity: qty },
      { onError: () => toast.error('Could not update quantity', 'Please try again.') },
    );
  }, [updateLine]);

  const handleRemoveLine = useCallback((id: string) => {
    removeLine.mutate(id, {
      onError: () => toast.error('Could not remove item', 'Please try again.'),
    });
  }, [removeLine]);

  const handleDiscard = useCallback(() => {
    discardDraft.mutate(undefined, {
      onSuccess: () => {
        toast.info('Draft discarded');
        void navigate('/catalogue');
      },
      onError: () => toast.error('Could not discard draft', 'Please try again.'),
    });
  }, [discardDraft, navigate]);

  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);

  // ── No draft ───────────────────────────────────────────────────────────
  if (!poId || lineItems.length === 0) return <EmptyDraft />;

  // ── Step 1: Line Items ─────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Supplier lock banner */}
      <div className="rounded-md border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs">
        <span className="text-slate-400">Supplier locked to </span>
        <span className="font-semibold text-slate-200">{supplierName}</span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700 text-left text-[11px] text-slate-500">
            <th className="pb-2 font-normal">Item</th>
            <th className="pb-2 text-right font-normal">Unit Price</th>
            <th className="pb-2 text-right font-normal">Qty</th>
            <th className="pb-2 text-right font-normal">Total</th>
            <th className="pb-2 font-normal" />
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li) => (
            <LineItemRow
              key={li.id}
              item={li}
              disabled={updateLine.isPending || removeLine.isPending}
              onQuantityChange={handleUpdateQty}
              onRemove={handleRemoveLine}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 text-right text-[11px] text-slate-500">Subtotal</td>
            <td className="pt-4 text-right font-mono font-semibold text-amber-400">
              {formatCurrency(subtotal)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleDiscard}
          disabled={discardDraft.isPending}
          className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40"
        >
          {discardDraft.isPending ? 'Discarding…' : 'Discard Draft'}
        </button>
        <button
          disabled={lineItems.length === 0}
          onClick={() => setStep(2)}
          className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-40"
        >
          Next → Header
        </button>
      </div>
    </div>
  );

  // ── Step 2: PO Header ──────────────────────────────────────────────────
  const renderStep2 = () => (
    <>
      {headerError && (
        <p className="mb-3 rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {headerError}
        </p>
      )}
      <POHeaderForm
        defaultValues={header ?? undefined}
        isSubmitting={saveHeader.isPending}
        onBack={() => { setHeaderError(null); setStep(1); }}
        onSubmit={async (values) => {
          setHeaderError(null);
          try {
            await saveHeader.mutateAsync(values);
            setStep(3);
          } catch {
            setHeaderError('Failed to save header. Please try again.');
          }
        }}
      />
    </>
  );

  // ── Step 3: Review & Submit ────────────────────────────────────────────
  const renderStep3 = () => {
    if (!header) { setStep(2); return null; }
    return (
      <POReview
        header={header}
        lineItems={lineItems}
        supplierName={supplierName ?? ''}
        isSubmitting={submitDraft.isPending}
        submitError={submitError}
        onEditItems={() => setStep(1)}
        onEditHeader={() => setStep(2)}
        onSubmit={async () => {
          setSubmitError(null);
          try {
            const po = await submitDraft.mutateAsync();
            toast.success('PO submitted', `${po.poNumber ?? po.id} has been submitted for approval.`);
            void navigate(`/po/${po.id}`);
          } catch (err) {
            const axErr = err as AxiosError<{ code: string; message?: string; currentSupplier?: string; attemptedSupplier?: string }>;
            const data = axErr.response?.data;
            if (data?.code === 'SUPPLIER_MISMATCH') {
              setSubmitError(
                `Supplier mismatch: PO is locked to "${data.currentSupplier}" but an item from "${data.attemptedSupplier}" was found.`,
              );
            } else {
              setSubmitError(data?.message ?? 'Submission failed. Please try again.');
            }
          }
        }}
      />
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {supplierId
            ? `Draft PO — ${supplierName}`
            : 'New Draft Purchase Order'}
        </h1>
        <span className="font-mono text-[11px] text-slate-500">
          {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <WizardSteps current={step} />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}

export default PODraftPage;
