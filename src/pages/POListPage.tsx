import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { usePOList } from '../hooks/usePurchaseOrders';
import { StatusBadge } from '../components/status/StatusBadge';
import { formatCurrency, formatDate } from '../lib/utils';

function POListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePOList({ pageSize: 50 });
  const pos = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-800" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-300">
        Failed to load purchase orders.
      </p>
    );
  }

  if (pos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <ClipboardList size={36} className="text-slate-600" />
        <p className="text-sm text-slate-400">No purchase orders yet.</p>
        <Link
          to="/catalogue"
          className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400"
        >
          Browse Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Purchase Orders</h1>
        <span className="font-mono text-[11px] text-slate-500">{data?.meta?.total} orders</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-slate-800">
            <tr className="border-b border-slate-700 text-left text-[11px] text-slate-500">
              <th className="px-4 py-3 font-normal">PO Number</th>
              <th className="px-4 py-3 font-normal">Supplier</th>
              <th className="px-4 py-3 text-right font-normal">Items</th>
              <th className="px-4 py-3 text-right font-normal">Total</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Created</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => {
              const total = po.lineItems.reduce((s, l) => s + l.lineTotal, 0);
              return (
                <tr
                  key={po.id}
                  onClick={() => void navigate(`/po/${po.id}`)}
                  className="cursor-pointer border-b border-slate-700/60 transition-colors hover:bg-slate-800/60"
                >
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {po.poNumber ?? <span className="text-slate-500 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{po.supplierName}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {po.lineItems.length}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-100">
                    {formatCurrency(total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {formatDate(po.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default POListPage;
