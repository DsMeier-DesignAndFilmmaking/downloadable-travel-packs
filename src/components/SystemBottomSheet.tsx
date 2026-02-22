import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AnimatePresence,
  motion,
  animate,
  useDragControls,
  useMotionValue,
  type PanInfo,
} from 'framer-motion';
import { X } from 'lucide-react';

export type SheetSnapState = 'partial' | 'full';

interface UseBottomSheetSnapOptions {
  isOpen: boolean;
  isDesktop: boolean;
  onDismiss: () => void;
  initialSnap?: SheetSnapState;
}

interface UseBottomSheetSnapResult {
  snap: SheetSnapState;
  isExpanded: boolean;
  viewportHeight: number;
  y: ReturnType<typeof useMotionValue<number>>;
  dragControls: ReturnType<typeof useDragControls>;
  onDragEnd: (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  dismiss: () => void;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 290,
  damping: 38,
  mass: 0.9,
  bounce: 0,
};

const PARTIAL_VIEWPORT_RATIO = 0.6;
const EXPAND_DISTANCE_THRESHOLD = 96;
const COLLAPSE_DISTANCE_THRESHOLD = 110;
const DISMISS_DISTANCE_THRESHOLD = 180;
const FAST_SWIPE_VELOCITY = 1100;
const FAST_UP_SWIPE_VELOCITY = -900;

function useMediaQuery(query: string) {
  const getMatches = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [getMatches, query]);

  return matches;
}

function useViewportHeight() {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => setHeight(window.innerHeight);
    const vv = window.visualViewport;

    update();
    window.addEventListener('resize', update);
    vv?.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      vv?.removeEventListener('resize', update);
    };
  }, []);

  return height;
}

// Manages snap state, drag thresholds, and spring-based settling between 60% and 100% states.
export function useBottomSheetSnap({
  isOpen,
  isDesktop,
  onDismiss,
  initialSnap = 'partial',
}: UseBottomSheetSnapOptions): UseBottomSheetSnapResult {
  const viewportHeight = useViewportHeight();
  const partialOffset = viewportHeight * (1 - PARTIAL_VIEWPORT_RATIO);
  const y = useMotionValue(partialOffset);
  const dragControls = useDragControls();
  const [snap, setSnap] = useState<SheetSnapState>(initialSnap);

  const animateTo = useCallback(
    (target: number) => {
      animate(y, target, SPRING_TRANSITION);
    },
    [y],
  );

  const snapToPartial = useCallback(() => {
    setSnap('partial');
    animateTo(partialOffset);
  }, [animateTo, partialOffset]);

  const snapToFull = useCallback(() => {
    setSnap('full');
    animateTo(0);
  }, [animateTo]);

  const dismiss = useCallback(() => {
    if (isDesktop) {
      onDismiss();
      return;
    }
    animate(y, viewportHeight, SPRING_TRANSITION).then(() => {
      onDismiss();
    });
  }, [isDesktop, onDismiss, viewportHeight, y]);

  useEffect(() => {
    if (!isOpen) return;
    if (isDesktop) {
      setSnap('full');
      y.set(0);
      return;
    }

    y.set(viewportHeight);
    if (initialSnap === 'full') {
      snapToFull();
      return;
    }
    snapToPartial();
  }, [initialSnap, isDesktop, isOpen, snapToFull, snapToPartial, viewportHeight, y]);

  useEffect(() => {
    if (!isOpen || isDesktop) return;
    if (snap === 'full') {
      animateTo(0);
      return;
    }
    animateTo(partialOffset);
  }, [animateTo, isDesktop, isOpen, partialOffset, snap]);

  const onDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const distanceY = info.offset.y;
      const velocityY = info.velocity.y;

      if (snap === 'full') {
        if (distanceY > DISMISS_DISTANCE_THRESHOLD || velocityY > FAST_SWIPE_VELOCITY) {
          snapToPartial();
          return;
        }
        if (distanceY > COLLAPSE_DISTANCE_THRESHOLD) {
          snapToPartial();
          return;
        }
        snapToFull();
        return;
      }

      if (distanceY < -EXPAND_DISTANCE_THRESHOLD || velocityY < FAST_UP_SWIPE_VELOCITY) {
        snapToFull();
        return;
      }

      // Dismiss from partial if dragged down enough or flung downward quickly.
      if (distanceY > DISMISS_DISTANCE_THRESHOLD || velocityY > FAST_SWIPE_VELOCITY) {
        dismiss();
        return;
      }

      snapToPartial();
    },
    [dismiss, snap, snapToFull, snapToPartial],
  );

  return {
    snap,
    isExpanded: snap === 'full',
    viewportHeight,
    y,
    dragControls,
    onDragEnd,
    dismiss,
  };
}

interface SystemBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  initialSnap?: SheetSnapState;
}

export default function SystemBottomSheet({
  isOpen,
  onClose,
  title,
  triggerRef,
  children,
  className = '',
  initialSnap = 'partial',
}: SystemBottomSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const priorFocusedElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const {
    snap,
    isExpanded,
    viewportHeight,
    y,
    dragControls,
    onDragEnd,
    dismiss,
  } = useBottomSheetSnap({
    isOpen,
    isDesktop,
    onDismiss: onClose,
    initialSnap,
  });

  const panelStyle = useMemo(() => {
    if (isDesktop) return undefined;
    return {
      y,
      height: `${viewportHeight}px`,
      maxHeight: `${viewportHeight}px`,
    };
  }, [isDesktop, viewportHeight, y]);

  useEffect(() => {
    if (!isOpen) return;

    // Scroll lock avoids background movement while the sheet is active.
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    priorFocusedElementRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }

      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Basic focus trap keeps keyboard navigation inside the dialog while open.
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismiss, isOpen]);

  useEffect(() => {
    // Restore focus only after an actual close, not on initial mount.
    if (wasOpenRef.current && !isOpen) {
      const fallback = triggerRef?.current ?? priorFocusedElementRef.current;
      fallback?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[180]">
          <motion.button
            type="button"
            aria-label="Close detailed value overview"
            onClick={dismiss}
            className="absolute inset-0 bg-slate-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
          />

          <div className="absolute inset-0 flex items-end justify-center md:items-center px-0 md:px-4 py-0 md:py-6">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`
                relative flex w-full flex-col bg-white border border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,0.18)]
                rounded-t-2xl md:rounded-2xl md:max-w-[720px] md:max-h-[85vh] md:h-auto
                ${className}
              `}
              style={panelStyle}
              drag={!isDesktop ? 'y' : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={!isDesktop ? { top: 0, bottom: viewportHeight } : undefined}
              dragElastic={!isDesktop ? 0.02 : 0}
              onDragEnd={onDragEnd}
              initial={
                isDesktop
                  ? { y: 28, opacity: 0 }
                  : { y: viewportHeight, opacity: 1 }
              }
              animate={
                isDesktop
                  ? {
                      y: 0,
                      opacity: 1,
                      transition: SPRING_TRANSITION,
                    }
                  : {
                      opacity: 1,
                    }
              }
              exit={
                isDesktop
                  ? { y: 18, opacity: 0, transition: { duration: 0.2 } }
                  : {
                      y: viewportHeight,
                      opacity: 1,
                      transition: SPRING_TRANSITION,
                    }
              }
            >
              <header className="sticky top-0 z-10 border-b border-slate-200 bg-white rounded-t-2xl">
                <div
                  className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300 md:hidden"
                  onPointerDown={(event) => {
                    // Drag starts from the handle/header so internal content scrolling never conflicts.
                    dragControls.start(event);
                  }}
                />
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-grab active:cursor-grabbing md:cursor-default"
                  onPointerDown={(event) => {
                    if (isDesktop) return;
                    dragControls.start(event);
                  }}
                >
                  <div>
                    <p
                      id={titleId}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                    >
                      {title}
                    </p>
                    {!isDesktop && (
                      <p className="mt-1 text-xs text-slate-500">
                        {snap === 'full' ? 'Expanded' : 'Drag up for full details'}
                      </p>
                    )}
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={dismiss}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 active:scale-95"
                    aria-label="Close more details"
                  >
                    <X size={16} />
                  </button>
                </div>
              </header>

              <div
                className={`
                  flex-1 min-h-0 px-5 pb-5 md:px-6 md:pb-6
                  ${isDesktop ? 'overflow-y-auto' : isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}
                `}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
