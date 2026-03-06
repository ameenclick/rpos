import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Variants, type Easing } from 'framer-motion';
import { TopBar } from './TopBar';
import { Toaster } from '../ui/Toaster';
import { useDraftStore } from '../../store/draftStore';
import { toast } from '../../store/toastStore';

const easeOut: Easing = 'easeOut';
const easeIn: Easing  = 'easeIn';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeOut } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15, ease: easeIn } },
};

/** One-shot toast on first load if a persisted draft exists */
function DraftRestoreNotice() {
  const { poId, supplierName } = useDraftStore();
  const notified = useRef(false);

  useEffect(() => {
    if (poId && !notified.current) {
      notified.current = true;
      toast.info(
        'Unsaved draft',
        supplierName
          ? `You have an active draft from ${supplierName}. Visit Draft to continue or discard.`
          : 'You have an unsaved draft. Visit Draft to continue or discard.',
      );
    }
    // Intentionally run only on mount — poId/supplierName are stable after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <TopBar />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="app-surface app-border border-t text-[10px] text-slate-500">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <span className="font-mono tracking-[0.18em] uppercase">
            Refinery Purchase Order System
          </span>
          <span>All data is mock-only for demo purposes.</span>
        </div>
      </footer>

      <Toaster />
      <DraftRestoreNotice />
    </div>
  );
}

export default AppShell;
