import * as RadixToast from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToastStore, type ToastVariant } from '../../store/toastStore';

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; border: string; title: string }> = {
  success: {
    icon: <CheckCircle size={14} className="text-emerald-400" />,
    border: 'border-emerald-700/50',
    title: 'text-emerald-300',
  },
  error: {
    icon: <AlertCircle size={14} className="text-red-400" />,
    border: 'border-red-700/50',
    title: 'text-red-300',
  },
  info: {
    icon: <Info size={14} className="text-blue-400" />,
    border: 'border-blue-700/50',
    title: 'text-blue-300',
  },
};

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <RadixToast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => {
        const cfg = variantConfig[t.variant];
        return (
          <RadixToast.Root
            key={t.id}
            open
            onOpenChange={(open) => { if (!open) remove(t.id); }}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-slate-900 px-4 py-3 shadow-xl',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-4 data-[state=open]:fade-in-0',
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-4 data-[state=closed]:fade-out-0',
              'duration-200',
              cfg.border,
            )}
          >
            <span className="mt-0.5 shrink-0">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <RadixToast.Title className={cn('text-xs font-semibold', cfg.title)}>
                {t.title}
              </RadixToast.Title>
              {t.description && (
                <RadixToast.Description className="mt-0.5 text-[11px] text-slate-400">
                  {t.description}
                </RadixToast.Description>
              )}
            </div>
            <RadixToast.Close
              onClick={() => remove(t.id)}
              className="mt-0.5 shrink-0 text-slate-600 hover:text-slate-300"
            >
              <X size={12} />
            </RadixToast.Close>
          </RadixToast.Root>
        );
      })}
      <RadixToast.Viewport className="fixed bottom-6 right-6 z-[100] flex w-80 flex-col gap-2" />
    </RadixToast.Provider>
  );
}
