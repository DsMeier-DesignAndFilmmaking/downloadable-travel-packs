import { Link } from 'react-router-dom';
import { Shield, Globe, Mail, Github, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-xl mx-auto px-6">
        
        {/* Top Section: Brand & Vision */}
        <div className="flex flex-col gap-6 mb-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-8 bg-[#FFDD00] shadow-sm" />
            <span className="text-[12px] font-black tracking-[0.2em] uppercase">
              Travel Buddy AI
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            Deploying autonomous travel intelligence since 2024. Cross-referencing 
            live field data to ensure your arrival is frictionless and secure.
          </p>
        </div>

        {/* Mid Section: Links Grid */}
        <div className="grid grid-cols-2 gap-10 mb-16">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol</h4>
            <ul className="space-y-3 text-sm font-bold text-[#222222]">
              <li><Link to="/" className="hover:text-emerald-600 transition-colors">Global Catalog</Link></li>
              <li><Link to="/about" className="hover:text-emerald-600 transition-colors">System Specs</Link></li>
              <li><Link to="/safety" className="hover:text-emerald-600 transition-colors">Safety Shield</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance</h4>
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
              <a href="#" aria-label="Email Support"><Mail size={18} /></a>
              <a href="#" aria-label="GitHub Source"><Github size={18} /></a>
              <Globe size={18} />
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
              <Shield size={12} className="text-emerald-600" />
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter">
                SSL Verified 2026
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              Made with <Heart size={10} className="text-rose-400 fill-rose-400" /> for the modern explorer.
            </p>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              © {currentYear} Travel Buddy AI Protocol. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}