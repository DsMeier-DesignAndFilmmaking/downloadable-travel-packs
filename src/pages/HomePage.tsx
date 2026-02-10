import { Link } from 'react-router-dom';
import { cityPacksList } from '../services/cityService';
import { Search, MapPin, Globe } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Travel Packs</h1>
          <p className="text-slate-400 font-medium">Offline survival guides for the world's top cities.</p>
        </header>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search 2025 top destinations..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          />
        </div>

        <section className="space-y-4">
          <h2 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">Available Packs</h2>
          <div className="grid gap-3">
            {cityPacksList.map((city) => (
              <Link 
                key={city.slug} 
                to={`/guide/${city.slug}`}
                className="group flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-sky-500/20 text-sky-400 p-3 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{city.name}</h3>
                    <p className="text-sm text-slate-500">{city.country}</p>
                  </div>
                </div>
                <Globe size={20} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}