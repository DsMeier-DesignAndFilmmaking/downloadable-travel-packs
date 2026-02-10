import React from 'react';

interface DebugBannerProps {
  data: any;
  cityId: string;
  loading?: boolean;
}

const DebugBanner: React.FC<DebugBannerProps> = ({ data, cityId, loading }) => {
  // Always check the environment first
  if (!import.meta.env.DEV) return null;

  return (
    <div className="bg-[#111] text-[10px] font-mono p-4 border-b-2 border-magenta-500 max-h-[400px] overflow-auto z-[100] relative">
      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
        <span className="text-magenta-400 font-bold tracking-tighter uppercase">
          Dev Mode: {cityId}
        </span>
        <div className="flex gap-4">
          <span className="text-white/40">Vite: {import.meta.env.MODE}</span>
          <span className={loading ? "text-yellow-400 animate-pulse" : "text-emerald-400"}>
            {loading ? "Fetching API..." : "API Connected"}
          </span>
        </div>
      </div>
      
      {loading ? (
        <div className="py-4 text-white/20 italic">Waiting for Travel-Buddy response...</div>
      ) : data ? (
        <pre className="text-emerald-300 leading-tight">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <div className="py-4 text-rose-400">No Data Received from API. Check Console/Network tab.</div>
      )}
    </div>
  );
};

export default DebugBanner;