import { cn } from '../../lib/utils';
import type { POStatus } from '../../types';

const config: Record<POStatus, { label: string; classes: string }> = {
  DRAFT:     { label: 'Draft',     classes: 'bg-slate-700 text-slate-300 border-slate-600' },
  SUBMITTED: { label: 'Submitted', classes: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  APPROVED:  { label: 'Approved',  classes: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' },
  REJECTED:  { label: 'Rejected',  classes: 'bg-red-900/60 text-red-300 border-red-700' },
  FULFILLED: { label: 'Fulfilled', classes: 'bg-teal-900/60 text-teal-300 border-teal-700' },
};

interface Props {
  status: POStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const { label, classes } = config[status];
  return (
    <span
      className={cn(
        'inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-widest uppercase',
        classes,
        className,
      )}
    >
      {label}
    </span>
  );
}
