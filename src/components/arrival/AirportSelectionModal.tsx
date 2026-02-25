/**
 * Modal for selecting airport when a multi-airport city (e.g. Mexico City) is opened
 * and the user has not yet selected an airport.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import type { AirportOption } from '@/data/multiAirport';

export interface AirportSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  options: AirportOption[];
  onSelect: (code: string) => void;
}

export default function AirportSelectionModal({
  isOpen,
  onClose,
  cityName,
  options,
  onSelect,
}: AirportSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="airport-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              id="airport-modal-title"
              className="text-sm font-black uppercase tracking-widest text-slate-700"
            >
              Select airport — {cityName}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Choose your arrival airport to see relevant transport and tips.
          </p>
          <ul className="space-y-2">
            {options.map((opt) => (
              <li key={opt.code}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(opt.code);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-100 active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-sm font-bold text-slate-700">
                    {opt.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{opt.name}</p>
                    {opt.distanceToCenter && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} />
                        {opt.distanceToCenter} to center
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
