import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { SyncStatus } from '@/hooks/useCityPack';

interface SyncButtonProps {
  onSync: () => Promise<void>;
  isOffline: boolean;
  status: SyncStatus;
}

export default function SyncButton({ onSync, isOffline, status }: SyncButtonProps) {
  
  const getStatusConfig = () => {
    if (isOffline) {
      return { 
        icon: <AlertCircle size={14} />, 
        label: "Offline", 
        classes: "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
      };
    }
    
    switch (status) {
      case 'syncing':
        return { 
          icon: <Loader2 size={14} className="animate-spin" />, 
          label: "Syncing...", 
          classes: "bg-white border-amber-200 text-amber-600" 
        };
      case 'success':
        return { 
          icon: <Check size={14} />, 
          label: "Intel Verified", 
          classes: "bg-[#E8FBF8] border-[#34D399]/30 text-[#065F46]" 
        };
      case 'error':
        return { 
          icon: <AlertCircle size={14} />, 
          label: "Retry Pulse", 
          classes: "bg-rose-50 border-rose-200 text-rose-600" 
        };
      default:
        return { 
          icon: <RefreshCw size={14} className="text-[#34D399]" />, 
          label: "Sync Pulse", 
          classes: "bg-white border-slate-200 text-[#222222] hover:shadow-md hover:border-slate-300" 
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.button
      onClick={onSync}
      disabled={isOffline || status === 'syncing'}
      whileTap={!isOffline && status !== 'syncing' ? { scale: 0.95 } : {}}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
        ${config.classes}
      `}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={status + (isOffline ? 'off' : 'on')}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          {config.icon}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
            {config.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Success Pulse Effect */}
      {status === 'success' && (
        <motion.div
          layoutId="pulse"
          className="absolute inset-0 rounded-full bg-[#34D399]/10"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 1 }}
          transition={{ duration: 0.4, repeat: 1, repeatType: 'reverse' }}
        />
      )}
    </motion.button>
  );
}