import { CloudOff, Globe, Zap } from 'lucide-react';

const COLUMNS = [
  {
    id: 'SYNC',
    icon: Globe,
    label: 'Live Intel Sync',
    detail: 'Automatic background updates for 2026 entry rules and visa alerts the second you’re back on the grid.'
  },
  {
    id: 'OFFLINE',
    icon: CloudOff,
    label: <>Offline <br /> Reliability</>,
    detail: 'Downloadable travel packs that stay 100% functional. Access your critical city guides without Wi-Fi or roaming.'
  },
  {
    id: 'SOLVE',
    icon: Zap,
    label: 'On-Ground Intel',
    detail: 'Real-world solutions for navigation, local logistics, and arrival hurdles—engineered to solve travel’s most common "in-the-moment" challenges.'
    },
] as const;

export default function AgenticValueProp() {
  return (
    <section className="w-full" aria-label="Core Travel Benefits">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map((col) => {
          const Icon = col.icon;

          return (
            <div 
              key={col.id} 
              className="relative bg-white border border-slate-100 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm h-full group transition-hover hover:border-slate-200"
            >
              {/* Icon Container */}
              <div className="mb-3 p-2 rounded-xl text-slate-500 bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
              </div>

              {/* Pillar ID */}
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-slate-400">
                {col.id}
              </h3>
              
              {/* Semantic SEO Label */}
              <p className="text-[15px] font-black text-[#222222] leading-tight mb-3">
                {col.label}
              </p>

              {/* High-Value Detail */}
              <div className="pt-3 mt-auto border-t border-slate-50 w-full">
                <p className="text-[11px] font-medium text-slate-500 leading-snug">
                  {col.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}