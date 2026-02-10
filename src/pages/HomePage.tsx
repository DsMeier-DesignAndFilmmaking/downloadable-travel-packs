import { Link } from 'react-router-dom';
import { cityPacksList } from '../services/cityService';
import { Search, MapPin, ChevronRight, Globe } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] antialiased">
      <main className="max-w-xl mx-auto px-6 py-16">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-10 bg-[#FFDD00] shadow-sm" /> {/* Nat Geo Iconic Portal */}
            <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50">Field Guides 2026</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-3">Travel Packs</h1>
          <p className="text-xl text-slate-500 font-light">Precision survival data for the modern explorer.</p>
        </header>

        <div className="relative mb-12 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search destination..." 
            className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#FFDD00]/20 focus:border-[#FFDD00] transition-all placeholder:text-slate-400"
          />
        </div>

        <section className="space-y-6">
          <h2 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">Current Catalog</h2>
          
          <div className="grid gap-4">
            {cityPacksList.map((city) => (
              <Link 
                key={city.slug} 
                to={`/guide/${city.slug}`}
                className="group relative flex items-center justify-between bg-white border border-slate-200 p-6 rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Brand Accent */}
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#FFDD00] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-r" />
                
                <div className="flex items-center gap-5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-[#FFDD00]/10 transition-colors">
                    <Globe size={22} className="text-slate-400 group-hover:text-[#222222]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl tracking-tight text-[#222222]">{city.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{city.country}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-[#222222] transition-colors" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}