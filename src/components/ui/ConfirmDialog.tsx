import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary' | 'teal';
  isPending?: boolean;
  /** Optional extra content rendered between description and actions */
  children?: React.ReactNode;
  onConfirm: () => void;
}

const confirmCls: Record<NonNullable<Props['confirmVariant']>, string> = {
  danger:  'bg-red-700 hover:bg-red-600 text-white',
  primary: 'bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold',
  teal:    'bg-teal-700 hover:bg-teal-600 text-white',
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  isPending,
  children,
  onConfirm,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-150',
          )}
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-sm font-semibold text-slate-100">{title}</Dialog.Title>
            <Dialog.Close className="shrink-0 text-slate-500 hover:text-slate-200">
              <X size={14} />
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className="mb-4 text-xs text-slate-400">
              {description}
            </Dialog.Description>
          )}

          {/* Slot for extra inputs */}
          {children && <div className="mb-4">{children}</div>}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-400">
              Cancel
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors disabled:opacity-50',
                confirmCls[confirmVariant],
              )}
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
