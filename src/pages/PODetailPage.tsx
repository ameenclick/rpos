import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePODetail, useApprovePO, useRejectPO, useFulfillPO } from '../hooks/usePurchaseOrders';
import { StatusBadge } from '../components/status/StatusBadge';
import { StatusTimeline } from '../components/status/StatusTimeline';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../lib/utils';
import { isValidTransition } from '../lib/businessRules';
import { toast } from '../store/toastStore';

// ── Action bar ────────────────────────────────────────────────────────────────
function ActionBar({ poId }: { poId: string }) {
  const { data: po } = usePODetail(poId);
  const approve = useApprovePO();
  const reject  = useRejectPO();
  const fulfill = useFulfillPO();

  const [rejectOpen,  setRejectOpen]  = useState(false);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [deliveryRef, setDeliveryRef] = useState('');
  const [rejectErr,   setRejectErr]   = useState('');

  if (!po) return null;

  const canApprove = isValidTransition(po.status, 'APPROVED');
  const canReject  = isValidTransition(po.status, 'REJECTED');
  const canFulfill = isValidTransition(po.status, 'FULFILLED');
  if (!canApprove && !canReject && !canFulfill) return null;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ id: po.id });
      toast.success('PO approved', `${po.poNumber ?? po.id} has been approved.`);
    } catch {
      toast.error('Approval failed', 'Please try again.');
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) { setRejectErr('Rejection notes are required.'); return; }
    setRejectErr('');
    try {
      await reject.mutateAsync({ id: po.id, notes: rejectNotes });
      toast.success('PO rejected', `${po.poNumber ?? po.id} has been rejected.`);
      setRejectOpen(false);
      setRejectNotes('');
    } catch {
      toast.error('Rejection failed', 'Please try again.');
    }
  };

  const handleFulfill = async () => {
    try {
      await fulfill.mutateAsync({ id: po.id, deliveryReference: deliveryRef || undefined });
      toast.success('PO fulfilled', `${po.poNumber ?? po.id} has been marked as fulfilled.`);
      setFulfillOpen(false);
      setDeliveryRef('');
    } catch {
      toast.error('Fulfillment failed', 'Please try again.');
    }
  };

  return (
    <>
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">Actions</p>
        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={approve.isPending}
              className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setRejectOpen(true)}
              className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30"
            >
              Reject…
            </button>
          )}
          {canFulfill && (
            <button
              onClick={() => setFulfillOpen(true)}
              className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-600"
            >
              Fulfill…
            </button>
          )}
        </div>
      </div>

      {/* Reject dialog */}
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={(v) => { setRejectOpen(v); setRejectErr(''); }}
        title="Reject Purchase Order"
        description={`You are about to reject ${po.poNumber ?? 'this draft'}. This action is terminal and cannot be undone.`}
        confirmLabel="Confirm Reject"
        confirmVariant="danger"
        isPending={reject.isPending}
        onConfirm={handleReject}
      >
        <div className="space-y-1">
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Rejection reason (required)"
            rows={3}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {rejectErr && <p className="text-[11px] text-red-400">{rejectErr}</p>}
        </div>
      </ConfirmDialog>

      {/* Fulfill dialog */}
      <ConfirmDialog
        open={fulfillOpen}
        onOpenChange={setFulfillOpen}
        title="Mark as Fulfilled"
        description={`Confirm fulfillment of ${po.poNumber ?? 'this PO'}. This action is terminal.`}
        confirmLabel="Confirm Fulfill"
        confirmVariant="teal"
        isPending={fulfill.isPending}
        onConfirm={handleFulfill}
      >
        <input
          type="text"
          value={deliveryRef}
          onChange={(e) => setDeliveryRef(e.target.value)}
          placeholder="Delivery reference (optional)"
          className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </ConfirmDialog>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: po, isLoading, isError } = usePODetail(id ?? '');

  if (!id) return <p className="text-xs text-slate-500">Invalid PO ID.</p>;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-1/3 rounded bg-slate-800" />
        <div className="h-32 rounded-lg bg-slate-800" />
        <div className="h-48 rounded-lg bg-slate-800" />
      </div>
    );
  }

  if (isError || !po) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-red-300">Purchase order not found or failed to load.</p>
        <Link to="/po" className="text-xs text-amber-500 hover:text-amber-300">← Back to list</Link>
      </div>
    );
  }

  const total = po.lineItems.reduce((s, l) => s + l.lineTotal, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back + title */}
      <div>
        <button
          onClick={() => void navigate(-1)}
          className="mb-3 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">Purchase Order</p>
            <h1 className="mt-0.5 font-mono text-xl font-bold text-slate-100">
              {po.poNumber ?? (
                <span className="text-sm font-normal italic text-slate-500">
                  Draft — no PO number yet
                </span>
              )}
            </h1>
          </div>
          <StatusBadge status={po.status} />
        </div>
      </div>

      {/* Header details */}
      {po.header && (
        <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">PO Header</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
            <div><dt className="text-slate-500">Requestor</dt><dd className="text-slate-200">{po.header.requestor}</dd></div>
            <div><dt className="text-slate-500">Cost Center</dt><dd className="font-mono text-slate-200">{po.header.costCenter}</dd></div>
            <div><dt className="text-slate-500">Needed By</dt><dd className="font-mono text-slate-200">{formatDate(po.header.neededByDate)}</dd></div>
            <div><dt className="text-slate-500">Payment Terms</dt><dd className="text-slate-200">{po.header.paymentTerms}</dd></div>
            <div><dt className="text-slate-500">Supplier</dt><dd className="text-slate-200">{po.supplierName}</dd></div>
            <div><dt className="text-slate-500">Buyer</dt><dd className="font-mono text-slate-200">{po.buyerId}</dd></div>
          </dl>
        </section>
      )}

      {/* Line items */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Line Items ({po.lineItems.length})
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-left text-[11px] text-slate-500">
              <th className="pb-2 font-normal">Item</th>
              <th className="pb-2 text-right font-normal">Unit Price</th>
              <th className="pb-2 text-right font-normal">Qty</th>
              <th className="pb-2 text-right font-normal">Lead Time</th>
              <th className="pb-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {po.lineItems.map((li) => (
              <tr key={li.id} className="border-b border-slate-700/40">
                <td className="py-2 pr-3">
                  <p className="text-slate-200">{li.name}</p>
                  <p className="font-mono text-[10px] text-slate-500">{li.model}</p>
                </td>
                <td className="py-2 pr-3 text-right font-mono text-slate-400">{formatCurrency(li.unitPrice)}</td>
                <td className="py-2 pr-3 text-right font-mono text-slate-300">{li.quantity}</td>
                <td className="py-2 pr-3 text-right font-mono text-slate-400">{li.leadTimeDays}d</td>
                <td className="py-2 text-right font-mono font-medium text-slate-100">{formatCurrency(li.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-3 text-right text-[11px] text-slate-500">Total</td>
              <td className="pt-3 text-right font-mono text-lg font-bold text-amber-400">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Status timeline */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">Status Timeline</p>
        <StatusTimeline events={po.statusTimeline} currentStatus={po.status} />
      </section>

      {/* Transition actions */}
      <ActionBar poId={po.id} />
    </div>
  );
}

export default PODetailPage;
