/**
 * SimWifiCard — SIM and WiFi info from props. Pure display; no async logic.
 */

import { Wifi, Smartphone } from 'lucide-react';

export interface SimWifiCardProps {
  eSimAdvice?: string | null;
  eSimHack?: string | null;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
  wifiNote?: string | null;
}

export default function SimWifiCard({
  eSimAdvice,
  eSimHack,
  wifiSsid,
  wifiPassword,
  wifiNote,
}: SimWifiCardProps) {
  const simAdvice = eSimAdvice?.trim();
  const simHack = eSimHack?.trim();
  const ssid = wifiSsid?.trim() || 'Airport Free WiFi';
  const password = wifiPassword?.trim() || 'Portal login';
  const note = wifiNote?.trim();
  const hasContent =
    Boolean(simAdvice) ||
    Boolean(simHack) ||
    Boolean(wifiSsid?.trim()) ||
    Boolean(wifiPassword?.trim());

  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-2">
        <Wifi size={16} className="text-slate-500 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          SIM & WiFi
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {(simAdvice || simHack) && (
          <div className="flex gap-2">
            <Smartphone size={14} className="mt-0.5 shrink-0 text-blue-600" />
            <div className="min-w-0 space-y-1">
              {simAdvice && (
                <p className="text-sm font-medium text-[#222222] leading-relaxed">
                  {simAdvice}
                </p>
              )}
              {simHack && simHack !== simAdvice && (
                <p className="text-xs text-slate-600 leading-relaxed">{simHack}</p>
              )}
            </div>
          </div>
        )}
        <div className="border-t border-neutral-100 pt-3 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Airport WiFi
          </p>
          <p className="text-sm font-medium text-[#222222]">
            SSID: <span className="font-semibold">{ssid}</span>
          </p>
          <p className="text-sm font-medium text-[#222222]">
            Password: <span className="font-semibold">{password}</span>
          </p>
          {note && (
            <p className="text-xs text-slate-500 italic mt-1">{note}</p>
          )}
        </div>
      </div>
    </div>
  );
}
