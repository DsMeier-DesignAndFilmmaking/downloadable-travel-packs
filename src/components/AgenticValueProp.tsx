import { CloudOff, Globe, Zap } from 'lucide-react';
import NativePlatformPreview from '@/components/NativePlatformPreview';

const COLUMNS = [
  {
    icon: Globe,
    detail: 'Instant sync for on-the-ground logic and local alerts—keeping your field intel fresh whenever you have a signal.',
  },
  {
    icon: CloudOff,
    detail: 'Downloadable travel packs that stay 100% functional. Access your critical city guides without Wi-Fi or roaming.',
  },
  {
    icon: Zap,
    detail: 'Real-world solutions for navigation, local logistics, and arrival hurdles—engineered to solve travel’s most common in-the-moment challenges.',
  },
] as const;

/** * Helper to prevent widows by replacing the last space with a non-breaking space
 */
const balanceText = (text: string) => {
  const words = text.split(' ');
  if (words.length <= 1) return text;
  const lastTwo = words.splice(-2).join('\u00A0'); // '\u00A0' is the unicode for &nbsp;
  return [...words, lastTwo].join(' ');
};

export default function AgenticValueProp() {
  return (
    <section aria-labelledby="core-benefits-heading" className="w-full">
      <h2 id="core-benefits-heading" className="sr-only">
        Core Travel Benefits
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {COLUMNS.map((col, index) => {
          const Icon = col.icon;

          return (
            <div
              key={index}
              className={`bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm h-full select-none
                ${index === 2 ? 'md:col-span-2 md:max-w-xl md:mx-auto' : ''}`}
            >
              <div className="mb-4 p-3 rounded-xl text-slate-700 bg-slate-100">
                <Icon
                  size={24}
                  strokeWidth={2}
                  aria-hidden="true"
                  focusable="false"
                />
              </div>

              {/* Description Container */}
              <div className="pt-6 border-t border-slate-100 w-full"> 
                {/* Added balanceText() and text-balance (Tailwind) 
                  text-balance is a modern CSS property that handles orphans well 
                */}
                <p className="text-sm text-slate-700 leading-relaxed font-medium text-balance">
                  {balanceText(col.detail)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <NativePlatformPreview />
      </div>
    </section>
  );
}
