import { AnimatePresence, motion } from 'framer-motion';

type SunSafetyAlertProps = {
  isOpen: boolean;
  uv: number | null;
  onClose: () => void;
};

export default function SunSafetyAlert({ isOpen, uv, onClose }: SunSafetyAlertProps) {
  const uvDisplay = typeof uv === 'number' ? uv.toFixed(1) : '--';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[220]">
          <motion.button
            type="button"
            aria-label="Close sun safety alert"
            onClick={onClose}
            className="absolute inset-0 w-full h-full bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <div className="absolute inset-x-0 bottom-0 px-4 pb-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sun-safety-alert-title"
              aria-describedby="sun-safety-alert-body"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="mx-auto w-full max-w-xl rounded-t-3xl border border-slate-200 border-t-4 border-t-red-500 bg-white p-6 shadow-2xl"
            >
              <h3 id="sun-safety-alert-title" className="text-xl font-black text-red-600">
                ⚠️ Extreme UV Warning
              </h3>
              <p id="sun-safety-alert-body" className="mt-3 text-sm md:text-base leading-relaxed text-slate-700">
                The UV Index is currently at {uvDisplay}. Skin damage can occur in less than 10 minutes. Please seek
                indoor shelter or maximum protection.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-red-700 active:scale-[0.98]"
              >
                Got it, staying safe
              </button>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
