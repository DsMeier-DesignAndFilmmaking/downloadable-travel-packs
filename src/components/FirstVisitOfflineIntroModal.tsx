import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type FirstVisitOfflineIntroModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function FirstVisitOfflineIntroModal({
  isOpen,
  onClose,
}: FirstVisitOfflineIntroModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const priorFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    priorFocusedElementRef.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => primaryActionRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      priorFocusedElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
          <motion.button
            type="button"
            aria-label="Close offline intro"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-intro-title"
            aria-describedby="offline-intro-description"
            className="relative z-[1] w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <h2 id="offline-intro-title" className="text-2xl font-black tracking-tight text-slate-900">
              Ready for Offline Use
            </h2>

            <p id="offline-intro-description" className="mt-3 text-sm leading-relaxed text-slate-700">
            City packs are saved for offline use in this browser.
            </p>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Want to add city field note packs to your device's home screen? <br></br>Tap <span className="font-semibold text-slate-700">'How To'</span> inside any city pack.
            </p>

            <button
              ref={primaryActionRef}
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
