import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface SyncButtonProps {
  onSync: () => Promise<any>;
  isOffline: boolean;
}

export default function SyncButton({ onSync, isOffline }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isOffline) return;
    setIsSyncing(true);
    await onSync();
    // Artificial delay for that "System Processing" feel
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <motion.button
      onClick={handleSync}
      disabled={isOffline || isSyncing}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-500
        ${isOffline 
          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
          : 'bg-white border-[#E8FBF8] text-[#222222] hover:shadow-md hover:border-[#E8FBF8]/80'}
      `}
    >
      <RefreshCw 
        size={14} 
        className={`${isSyncing ? 'animate-spin' : ''} ${isOffline ? 'opacity-20' : 'text-[#E8FBF8]'}`} 
        color={!isOffline ? "#34D399" : undefined} // Using a minty green to match your #E8FBF8 vibe
      />
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
        {isSyncing ? 'Syncing...' : isOffline ? 'Offline' : 'Sync Pulse'}
      </span>
    </motion.button>
  );
}