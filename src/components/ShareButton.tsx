/**
 * ShareButton: Web Share API when available, otherwise modal with
 * iOS/Android-specific instructions. Emphasizes that only the current guide is saved.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Share2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ShareButtonProps = {
  /** Display name of the guide (e.g. "Tokyo") */
  guideName: string;
  /** Full URL to share; defaults to current window location */
  guideUrl?: string;
  /** Optional class for the trigger button */
  className?: string;
  /** Optional "Add to Home Screen" emphasis in share text */
  addToHomeScreen?: boolean;
};

function getPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.share);
}

export default function ShareButton({
  guideName,
  guideUrl,
  className = '',
  addToHomeScreen = true,
}: ShareButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const url = guideUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
  const platform = getPlatform();
  const useNativeShare = canUseWebShare();

  const handleShare = useCallback(async () => {
    setShareError(null);
    if (useNativeShare && navigator.share) {
      try {
        await navigator.share({
          title: `${guideName} Travel Pack`,
          text: addToHomeScreen
            ? `Save the ${guideName} guide for offline use. Only this guide will be saved to your device.`
            : `${guideName} Travel Pack — survival, emergency & arrival.`,
          url,
        });
        setModalOpen(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setShareError((err as Error).message || 'Share failed');
          setModalOpen(true);
        }
      }
      return;
    }
    setModalOpen(true);
  }, [guideName, url, useNativeShare, addToHomeScreen]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setShareError(null);
    previouslyFocused.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
  }, [modalOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (modalOpen) {
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }
  }, [modalOpen, closeModal]);

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#222222] text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2 active:scale-[0.98] ${className}`}
        aria-label={`Share ${guideName} guide`}
      >
        <Share2 size={18} strokeWidth={2.5} aria-hidden />
        <span>Share guide</span>
      </button>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            aria-describedby="share-modal-desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#F7F7F7] rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2
                    id="share-modal-title"
                    className="text-lg font-bold text-[#222222] leading-tight"
                  >
                    Add this guide to your home screen
                  </h2>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={closeModal}
                    className="shrink-0 p-1.5 rounded-full text-slate-500 hover:bg-slate-200 hover:text-[#222222] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    aria-label="Close"
                  >
                    <X size={20} strokeWidth={2} aria-hidden />
                  </button>
                </div>

                <p
                  id="share-modal-desc"
                  className="mt-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"
                >
                  Only the <strong>{guideName}</strong> guide will be saved — not the whole app or other cities.
                </p>

                {shareError && (
                  <p className="mt-2 text-sm text-rose-600" role="alert">
                    {shareError}
                  </p>
                )}

                <div className="mt-4 text-slate-600 text-sm space-y-4">
                  {platform === 'ios' && (
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Tap the <strong>Share</strong> icon (box with arrow up) in the browser bar.</li>
                      <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
                      <li>Tap <strong>Add</strong> to save only this guide.</li>
                    </ol>
                  )}
                  {platform === 'android' && (
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Tap the <strong>menu</strong> (⋮) or Share icon in the browser.</li>
                      <li>Choose <strong>Add to Home screen</strong> or <strong>Share</strong> then your preferred app.</li>
                      <li>Only this guide will be available offline.</li>
                    </ol>
                  )}
                  {platform === 'other' && (
                    <p>
                      Use your browser&apos;s Share or Menu to &quot;Add to Home screen&quot; or install the app. Only the <strong>{guideName}</strong> guide will be saved.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-6 w-full py-3 rounded-full bg-[#222222] text-white font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
