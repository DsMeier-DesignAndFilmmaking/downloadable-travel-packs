import { Link } from 'react-router-dom';
import { Shield, Mail, Github, Heart, Cpu, Scale, Wifi } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    /* CHANGE: Updated pb-8 to pb-44. 
       This 11rem (176px) buffer ensures that the "All Rights Reserved" 
       text clears the fixed "Save Field Pack" button and its background blur.
    */
    <footer className="w-full bg-white border-t border-slate-200 pt-8 pb-44 mt-0">
      <div className="max-w-xl mx-auto px-6">
        
        {/* Top Section: Brand & Vision */}
        <div className="flex flex-col gap-6 mb-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-8 bg-[#FFDD00] shadow-sm" aria-hidden="true" />
            <span className="text-[12px] font-black tracking-[0.2em] uppercase">
            Field Protocol // Genesis Build
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            Solving real-time travel friction with live field intelligence. The protocol 
            ensures <span className="text-[#222222] font-bold">offline availability</span> for 
            critical data—automatically syncing the latest ground-truth intel when online 
            so you’re never without a solution while your roaming around the planet.
          </p>
        </div>

        {/* Mid Section: Links Grid */}
        <div className="grid grid-cols-2 gap-10 mb-16">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Cpu size={12} /> Protocol
            </h4>
            <ul className="space-y-3 text-sm font-bold text-[#222222]">
              <li><Link to="/" className="hover:text-emerald-600 transition-colors">Global Catalog</Link></li>
              <li><Link to="/specs" className="hover:text-emerald-600 transition-colors">System Specs</Link></li>
              <li><Link to="/security-protocol" className="hover:text-emerald-600 transition-colors">Security Protocol</Link></li>
              <li><Link to="/settings" className="hover:text-emerald-600 transition-colors">Settings</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Scale size={12} /> Compliance
            </h4>
            <ul className="space-y-3 text-sm font-bold text-[#222222]">
              <li><Link to="/privacy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-emerald-600 transition-colors">Terms of Service</Link></li>
              <li><Link to="/disclaimer" className="hover:text-emerald-600 transition-colors">Travel Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Meta Info */}
        <div className="pt-8 border-t border-slate-100 flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-slate-400">
              <a href="mailto:support@travelbuddy.io" aria-label="Email Support" className="hover:text-[#222222] transition-colors">
                <Mail size={18} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub Source" className="hover:text-[#222222] transition-colors">
                <Github size={18} />
              </a>
              <div className="flex items-center gap-1.5 text-emerald-500">
                <Wifi size={18} />
                <span className="text-[10px] font-black uppercase tracking-tighter">Sync Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
              <Shield size={12} className="text-emerald-600" />
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter">
                O2O Verified 2026
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              Engineered with <Heart size={10} className="text-rose-400 fill-rose-400" /> for the modern traveler.
            </p>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              © {currentYear} All Rights Reserved // MODERN TRAVEL FIELD NOTES
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}