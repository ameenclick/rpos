import { cn, formatDate } from '../../lib/utils';
import type { POStatus, StatusEvent } from '../../types';

const dotColor: Record<POStatus, string> = {
  DRAFT:     'bg-slate-500 ring-slate-700',
  SUBMITTED: 'bg-blue-500 ring-blue-800',
  APPROVED:  'bg-emerald-500 ring-emerald-800',
  REJECTED:  'bg-red-500 ring-red-800',
  FULFILLED: 'bg-teal-400 ring-teal-800',
};

interface Props {
  events: StatusEvent[];
  currentStatus: POStatus;
}

export function StatusTimeline({ events, currentStatus }: Props) {
  return (
    <ol className="relative space-y-0 border-l border-slate-700 pl-6">
      {events.map((ev, i) => {
        const isCurrent = i === events.length - 1;
        return (
          <li key={ev.id} className="pb-6 last:pb-0">
            {/* dot */}
            <span
              className={cn(
                'absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-2',
                dotColor[ev.toStatus],
                isCurrent && 'ring-offset-1 ring-offset-slate-900',
              )}
            />
            <div className="space-y-0.5">
              <p
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider font-mono',
                  isCurrent ? 'text-amber-400' : 'text-slate-300',
                )}
              >
                {ev.toStatus}
                {isCurrent && ev.toStatus === currentStatus && (
                  <span className="ml-2 text-[10px] normal-case tracking-normal text-amber-500/70">
                    current
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400">
                By{' '}
                <span className="font-mono text-slate-200">{ev.changedBy}</span>
                {' · '}
                {formatDate(ev.changedAt)}
              </p>
              {ev.notes && (
                <p className="mt-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 italic">
                  "{ev.notes}"
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
