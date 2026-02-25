import { SquareUser, Info } from 'lucide-react';
import type { FacilityIntel } from '@/types/cityPack';

export default function FacilityKit({ data }: { data: FacilityIntel }) {
  if (!data) return null;

  // Audit: Swapped "Specs/Logic" for helpful, traveler-centric language
  const specs = [
    { label: "How to enter", value: data.access },
    { label: "Cleanliness", value: data.hygiene },
    { label: "The Setup", value: data.protocol },
    { label: "Where to find", value: data.availability },
  ];

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
<div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl transition-all duration-300">          
          <SquareUser size={22} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div>
          {/* ADA compliant headline - 14px */}
          <h4 className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-900 leading-tight">
            Restroom Guide
          </h4>
          
          {/* New Subline - Subtle, italicized footnote style */}
          <p className="text-[11px] font-medium italic text-slate-400 mt-0.5">
            *Generally speaking
          </p>
          
          {/* Audit: Casual, relatable sub-header - 11px
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 border-t border-slate-100 pt-1">
            Restrooms <span className="text-slate-300 mx-1" aria-hidden="true">//</span> Local Intel
          </p> */}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-y-6 gap-x-8">
        {specs.map((spec) => (
          <div key={spec.label}>
            {/* ADA Audit: Labels increased to 11px and Slate-500 for contrast */}
            <p className="text-[11px] uppercase font-black text-slate-500 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              {spec.label}
            </p>
            {/* ADA Audit: Body text bumped to 15px for clear mobile reading */}
            <p className="text-[15px] font-bold text-[#1a1a1a] leading-tight">
              {spec.value}
            </p>
          </div>
        ))}
      </div>

      {/* Subtle background texture */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Info size={80} />
      </div>
    </div>
  );
}