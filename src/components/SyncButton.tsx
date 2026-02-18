import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2, DownloadCloud } from 'lucide-react';
// Ensure this type now includes 'success' and 'complete'
import type { SyncStatus } from '@/hooks/useCityPack';

interface SyncButtonProps {
  onSync: () => Promise<void>;
  isOffline: boolean;
  status: SyncStatus;
}

export default function SyncButton({ onSync, isOffline, status }: SyncButtonProps) {
  
  const getStatusConfig = () => {
    // We cast status to string briefly to avoid the "no overlap" error 
    // if your local Type definition hasn't updated yet.
    const currentStatus = status as string;
    const isDone = currentStatus === 'success' || currentStatus === 'complete';

    // 1. SUCCESS IS PRIORITY
    if (isDone) {
      return { 
        icon: <Check size={14} />, 
        label: "Intel Secured", 
        classes: "bg-[#E8FBF8] border-[#34D399]/30 text-[#065F46] cursor-default" 
      };
    }

    // 2. SYNCING STATE
    if (currentStatus === 'syncing') {
      return { 
        icon: <Loader2 size={14} className="animate-spin" />, 
        label: "Securing Assets...", 
        classes: "bg-white border-amber-200 text-amber-600 cursor-wait" 
      };
    }

    // 3. OFFLINE BLOCKER (Only if not already synced)
    if (isOffline) {
      return { 
        icon: <AlertCircle size={14} />, 
        label: "Connection Required", 
        classes: "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
      };
    }
    
    // 4. ERROR STATE
    if (currentStatus === 'error') {
      return { 
        icon: <AlertCircle size={14} />, 
        label: "Retry Sync", 
        classes: "bg-rose-50 border-rose-200 text-rose-600" 
      };
    }

    // 5. DEFAULT / IDLE
    return { 
      icon: <DownloadCloud size={14} className="text-[#34D399]" />, 
      label: "Download Pack", 
      classes: "bg-white border-slate-200 text-[#222222] hover:shadow-md hover:border-slate-300" 
    };
  };

  const config = getStatusConfig();
  // Using type assertion to bypass the "no overlap" linting error during the transition
  const isDone = (status as string) === 'success' || (status as string) === 'complete';

  return (
    <motion.button
    onClick={() => { // Removed the (e) to fix TS6133
      if (isDone) return;
      onSync();
    }}
      disabled={(isOffline && !isDone) || status === 'syncing'}
      whileTap={(!isOffline || isDone) && status !== 'syncing' ? { scale: 0.95 } : {}}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
        ${config.classes}
      `}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={status + (isOffline ? 'off' : 'on')}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          {config.icon}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
            {config.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {isDone && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-[#34D399] rounded-full border border-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      )}
    </motion.button>
  );
}