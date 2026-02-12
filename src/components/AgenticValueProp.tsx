import { CloudOff, Globe, Zap } from 'lucide-react';

const COLUMNS = [
  {
    icon: Globe,
    title: 'Live Sync',
    detail:
      'Automatic background updates for 2026 entry rules and visa alerts the second you’re back on the grid.',
  },
  {
    icon: CloudOff,
    title: 'Offline Storage',
    detail:
      'Downloadable travel packs that stay 100% functional. Access your critical city guides without Wi-Fi or roaming.',
  },
  {
    icon: Zap,
    title: 'On-Ground Intel',
    detail:
      'Real-world solutions for navigation, local logistics, and arrival hurdles—engineered to solve travel’s most common in-the-moment challenges.',
  },
] as const;

export default function AgenticValueProp() {
  return (
    <section aria-labelledby="core-benefits-heading" className="w-full">
      {/* Accessible Section Heading */}
      <h2 id="core-benefits-heading" className="sr-only">
        Core Travel Benefits
      </h2>

      {/* 2 Top, 1 Bottom Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {COLUMNS.map((col, index) => {
          const Icon = col.icon;

          return (
            <div
              key={col.title}
              className={`bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm h-full
                ${index === 2 ? 'md:col-span-2 md:max-w-xl md:mx-auto' : ''}`}
            >
              {/* Decorative Icon */}
              <div className="mb-4 p-3 rounded-xl text-slate-700 bg-slate-100">
                <Icon
                  size={24}
                  strokeWidth={2}
                  aria-hidden="true"
                  focusable="false"
                />
              </div>

              {/* Card Heading */}
              <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                {col.title}
              </h3>

              {/* Description */}
              <div className="pt-4 mt-auto border-t border-slate-200 w-full">
                <p className="text-sm text-slate-700 leading-relaxed">
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