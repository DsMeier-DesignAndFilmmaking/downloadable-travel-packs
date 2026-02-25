import { SquareUser, Info, MapPin, Store, Navigation } from 'lucide-react';
import type { FacilityIntel } from '@/types/cityPack';
import type { OverpassResult } from '@/services/overpassService';

interface FacilityKitProps {
  data: FacilityIntel;
  nearestRestroom?: OverpassResult | null;
}

export default function FacilityKit({ data, nearestRestroom }: FacilityKitProps) {
  if (!data) return null;

  const specs = [
    { label: "How to enter", value: data.access },
    { label: "Cleanliness", value: data.hygiene },
    { label: "The Setup", value: data.protocol },
    { label: "Where to find", value: data.availability },
  ];

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[350px]">
      <div>
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl transition-all duration-300">          
            <SquareUser size={22} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-900 leading-tight">
              Restroom Guide
            </h4>
            <p className="text-[11px] font-medium italic text-slate-400 mt-0.5">
              *Generally speaking
            </p>
          </div>
        </div>
        
        {/* Static Intel Grid */}
        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
          {specs.map((spec) => (
            <div key={spec.label}>
              <p className="text-[11px] uppercase font-black text-slate-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {spec.label}
              </p>
              <p className="text-[15px] font-bold text-[#1a1a1a] leading-tight">
                {spec.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Overpass API Section (Live Locator) */}
      {/* Dynamic Overpass API Section (Live Locator) */}
{nearestRestroom && (
  <div className="mt-8 relative z-10">
    <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-2xl backdrop-blur-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {nearestRestroom.type === 'sanborns' ? (
              <Store size={14} className="text-blue-600 shrink-0" />
            ) : (
              <MapPin size={14} className="text-blue-600 shrink-0" />
            )}
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.15em]">
              Live: Nearest Reliable Spot
            </p>
          </div>
          
          <p className="text-[15px] font-black text-blue-900 leading-tight">
            {nearestRestroom.displayName}
          </p>
          
          <p className="text-[11px] font-bold text-blue-600/80 mt-1">
            Approx. {nearestRestroom.distanceMeters}m away
          </p>
        </div>

        {/* NEW: Navigation Button */}
        <a 
          href={`https://www.google.com/maps/dir/?api=1&destination=${nearestRestroom.lat},${nearestRestroom.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center"
          aria-label="Navigate to restroom"
        >
          <Navigation size={18} fill="white" />
        </a>
      </div>
    </div>
  </div>
)}

      {/* Subtle background texture */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Info size={80} />
      </div>
    </div>
  );
}