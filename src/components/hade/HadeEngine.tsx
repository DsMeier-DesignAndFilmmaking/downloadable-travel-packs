import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GoogleMap, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import type { CityPack, HadeContext } from "@/types/cityPack";
import {
  getHadeInsight,
  type HadeDecisionResponse,
} from "@/utils/cityPackIdb";
import { useHadeCtx } from "@/contexts/HadeContextProvider";
import { getHadeRecommendations } from "@/lib/hade/engine";
import { PivotScannerFAB } from "@/components/hade/PivotScannerFAB";
import {
  callHadeApi,
  toGeneratedOutput,
  type GeneratedOutput,
  type ModuleContext,
} from "@/lib/hade/llmService";

// ─── Explored-nodes ring buffer ───────────────────────────────────────────────

const EXPLORED_NODES_KEY = 'explored-nodes-v1';
const EXPLORED_NODES_MAX = 50;

interface ExploredNode {
  slug: string;
  subNode: string;
  timestamp: number;
}

function appendExploredNode(slug: string, subNode: string): void {
  try {
    const raw = localStorage.getItem(EXPLORED_NODES_KEY);
    const entries: ExploredNode[] = raw ? (JSON.parse(raw) as ExploredNode[]) : [];
    entries.push({ slug, subNode, timestamp: Date.now() });
    if (entries.length > EXPLORED_NODES_MAX) entries.splice(0, entries.length - EXPLORED_NODES_MAX);
    localStorage.setItem(EXPLORED_NODES_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable or quota exceeded — silently skip
  }
}

// ─── Types & Theme ────────────────────────────────────────────────────────────

type StepId = "input" | "processing" | "result" | "mapping";
type LlmChoice = "gemini" | "llama" | "claude";

interface SignalState {
  combinedSignal: string;
  moduleContext: ModuleContext;
  location: string;
  llmChoice: LlmChoice;
}

export interface HadeEngineProps {
  cityPack: CityPack;
  accent?: string;
  className?: string;
}

// Default signal template — location is always injected from cityPack on mount
const DEFAULT_SIGNAL: SignalState = {
  combinedSignal: "",
  moduleContext: "weather-vibe",
  location: "",
  llmChoice: "gemini",
};

const MODULE_THEMES: Record<
  ModuleContext,
  {
    primary: string;
    label: string;
    metricLabel: string;
    resultTitle: string;
    baseDesc: string;
    tagline: string;
    action: string;
  }
> = {
  "weather-vibe": {
    primary: "#10B981",
    label: "City Pulse",
    metricLabel: "Local Conditions",
    resultTitle: "A Change of Plans?",
    baseDesc: "We've found a hidden node in the city that holds the exact atmosphere you're after.",
    tagline: "Live Environment",
    action: "See the Spot",
  },
  "expert-network": {
    primary: "#6366F1",
    label: "Explore the Network",
    metricLabel: "Trust Connection",
    resultTitle: "Someone You Should Meet",
    baseDesc: "A verified contact from your extended network is flagged as a high-signal intro window.",
    tagline: "Trusted Connections",
    action: "Go Connect",
  },
  "mood-journey": {
    primary: "#F43F5E",
    label: "Mood Journey",
    metricLabel: "Inspiration Level",
    resultTitle: "A Moment of Zen",
    baseDesc: "We've charted a path through the city that mirrors that exact frequency.",
    tagline: "Emotional Arc",
    action: "Follow the Path",
  },
  "meet-someone": {
    primary: "#8B5CF6",
    label: "Meet Someone",
    metricLabel: "Social Match",
    resultTitle: "Spontaneous Coffee?",
    baseDesc: "HADE has surfaced a low-friction window to connect with others nearby organically.",
    tagline: "Organic Meetups",
    action: "Signal Interest",
  },
  "the-wildcard": {
    primary: "#3B82F6",
    label: "The Wildcard",
    metricLabel: "Spontaneity Score",
    resultTitle: "Off the Beaten Path",
    baseDesc: "We've surfaced a node that no algorithm has indexed yet.",
    tagline: "True Discovery",
    action: "Explore Now",
  },
};

// ─── Heuristic Intent Hook ────────────────────────────────────────────────────

const HARD_IGNORE = new Set([
  // Modal verbs
  "should","would","could","might","shall","must",
  // Auxiliary verbs
  "am","is","are","was","were","been","being","have","has","had","do","does","did",
  // High-frequency filler
  "really","very","looking","want","wants","please","just","also","even","like",
  // Stop words
  "the","with","for","a","an","i","to","of","near","find","in","at","and",
  "or","but","not","that","this","my","me","we","you","it","as","be",
  "when","some","show","where","there","here","then","than",
]);

const extractHighSignalWord = (input: string): string => {
  if (!input.trim()) return "Discovery";
  const raw = input
    .toLowerCase()
    .replace(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/g, "")
    .split(/\s+/);
  // 4-char minimum, exemptions for "cat" and "art"
  const candidates = raw.filter(
    (w) => !HARD_IGNORE.has(w) && (w.length >= 4 || w === "cat" || w === "art"),
  );
  if (candidates.length === 0) return "Discovery";
  // Last qualifying word — intent peaks at end of prompt
  const word = candidates[candidates.length - 1];
  return word.charAt(0).toUpperCase() + word.slice(1);
};

// ─── Map Style ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GOOGLE_MAP_DARK_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#0A0C10" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0A0C10" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#111827" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0A0C10" }] },
];

// ─── LLM Selector (Gemini · Llama · Claude — no mock options) ────────────────

const LLM_OPTIONS: Array<{ id: LlmChoice; label: string; detail: string }> = [
  { id: "gemini", label: "Gemini", detail: "Google Deep Reasoning" },
  { id: "llama",  label: "Llama",  detail: "Open Strategy Layer"  },
  { id: "claude", label: "Claude", detail: "Spatial Architect"    },
];

// ─── Sub-Components ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EngineSettings({ signal, setSignal }: any) {
  return (
    <div className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-3">
      <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink/60">
        Neural Backbone
      </p>
      <div className="grid grid-cols-3 gap-2">
        {LLM_OPTIONS.map((option) => {
          const active = signal.llmChoice === option.id;
          return (
            <button
              key={option.id}
              onClick={() =>
                setSignal((p: SignalState) => ({ ...p, llmChoice: option.id }))
              }
              className="relative overflow-hidden rounded-xl border border-ink/10 px-3 py-3 text-left"
            >
              {active && (
                <motion.div
                  layoutId="active-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-ink"
                />
              )}
              <div className="relative z-10">
                <p
                  className={`text-[11px] font-black uppercase tracking-widest ${
                    active ? "text-white" : "text-ink/70"
                  }`}
                >
                  {option.label}
                </p>
                <p
                  className={`mt-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
                    active ? "text-white/60" : "text-ink/60"
                  }`}
                >
                  {option.detail}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProcessingStep = React.memo(function ProcessingStep({ signal, onComplete, duration = 3200 }: any) {
  const theme = MODULE_THEMES[signal.moduleContext as ModuleContext];

  useEffect(() => {
    const t = setTimeout(onComplete, duration);
    return () => clearTimeout(t);
  }, [onComplete, duration]);

  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center rounded-[2.5rem] bg-white/70 p-12 backdrop-blur-2xl">
      <div className="w-full max-w-sm space-y-12">
        <div className="relative mx-auto h-20 w-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute inset-0 rounded-full border-[4px] border-ink/5"
            style={{ borderTopColor: theme.primary }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-4 rounded-full"
            style={{ background: theme.primary }}
          />
        </div>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink/60">
              {theme.metricLabel} Check
            </span>
            <div className="h-1 w-full bg-ink/5 rounded-full overflow-hidden mt-4">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: duration / 1000 }}
                className="h-full"
                style={{ background: theme.primary }}
              />
            </div>
          </div>
          <p className="text-center text-[10px] font-bold text-ink/60 uppercase tracking-[0.3em]">
            Routing {signal.llmChoice} Vector...
          </p>
          <p className="text-center text-[10px] font-bold text-ink/60 uppercase tracking-[0.2em]">
            [{signal.combinedSignal.split(" ").slice(0, 5).join(" ")}
            {signal.combinedSignal.split(" ").length > 5 ? "..." : ""}]
          </p>
        </div>
      </div>
    </div>
  );
});

function AiRefinePanel({
  signal,
  setSignal,
  onExplore,
  isLoading,
}: {
  signal: SignalState;
  setSignal: React.Dispatch<React.SetStateAction<SignalState>>;
  onExplore: () => void;
  isLoading: boolean;
}) {
  const theme = MODULE_THEMES[signal.moduleContext];
  const hasInput = signal.combinedSignal.trim().length > 0;

  return (
    <details className="group mt-4 overflow-hidden rounded-[2rem] border border-ink/10 bg-white/60 backdrop-blur-xl">
      <summary className="flex cursor-pointer list-none select-none items-center justify-between px-6 py-4">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/60">
          Refine with AI{' '}
          <span className="font-medium normal-case tracking-normal text-ink/60">
            (Optional)
          </span>
        </span>
        {/* Chevron — rotates when open via CSS group-open */}
        <svg
          className="h-4 w-4 text-ink/60 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="px-6 pb-6">
        <textarea
          value={signal.combinedSignal}
          onChange={(e) =>
            setSignal((p) => ({ ...p, combinedSignal: e.target.value }))
          }
          className="mt-4 w-full resize-none rounded-[1.2rem] border-none bg-ink/[0.03] p-5 text-lg outline-none transition-all focus:bg-ink/[0.05] placeholder:text-ink/40"
          placeholder="e.g. 'I'm tired of tourist spots, show me where the locals hide when it rains'..."
          rows={3}
        />

        <div className="mt-4 rounded-2xl border border-ink/5 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-[10px] font-black uppercase text-ink/60">
            Focus On…
          </label>
          <select
            value={signal.moduleContext}
            onChange={(e) =>
              setSignal((p) => ({
                ...p,
                moduleContext: e.target.value as ModuleContext,
              }))
            }
            className="w-full cursor-pointer bg-transparent text-sm font-bold outline-none"
          >
            {Object.keys(MODULE_THEMES).map((k) => (
              <option key={k} value={k}>
                {MODULE_THEMES[k as ModuleContext].label}
              </option>
            ))}
          </select>
        </div>

        <EngineSettings signal={signal} setSignal={setSignal} />

        <div className="mt-6 flex justify-end">
          <button
            onClick={onExplore}
            disabled={isLoading || !hasInput}
            className="flex items-center gap-3 rounded-full px-8 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: isLoading ? '#6B7280' : theme.primary }}
          >
            {isLoading ? 'Orchestrating…' : 'Explore the Moment →'}
          </button>
        </div>
      </div>
    </details>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultStep({ signal, generatedOutput, onRestart, onGo, cityPack }: any) {
  const theme = MODULE_THEMES[signal.moduleContext as ModuleContext];

  const displayKeyword =
    generatedOutput?.keyword || generatedOutput?.primary?.keyword || "HADE Node";

  // Regex: replace the last space with \u00a0 (non-breaking space) to prevent
  // a lone last word from orphaning onto its own line on narrow mobile viewports.
  const rawDesc: string =
    generatedOutput?.description ||
    generatedOutput?.primary?.description ||
    `Processing ${cityPack.name} signal...`;
  const displayDesc = rawDesc.replace(/\s(\S+)$/, "\u00a0$1");

  return (
    <div className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[2.5rem] bg-ink p-8 text-black shadow-2xl md:p-12">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-1 w-12 rounded-full" style={{ background: theme.primary }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            {theme.tagline} Output
          </span>
        </div>

        <h4 className="text-5xl font-bold tracking-tighter leading-tight max-w-xl">
          {theme.resultTitle}
        </h4>

        {/* City name is dynamic — bound to cityPack.name */}
        <p className="mt-8 text-2xl text-black/50 leading-relaxed font-light max-w-2xl italic">
          "We've tuned the{" "}
          <span className="text-black not-italic">{cityPack.name}</span>{" "}
          pulse for{" "}
          <span
            style={{
              textDecorationLine: "underline",
              textDecorationColor: theme.primary,
              textDecorationThickness: "1px",
              textUnderlineOffset: "8px",
              color: "white",
              opacity: 1,
            }}
          >
            {displayKeyword}
          </span>
          . {displayDesc}"
        </p>

        {generatedOutput.tags?.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {generatedOutput.tags.slice(0, 4).map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 flex flex-col md:flex-row items-center gap-6 border-t border-white/5 pt-10">
        <button
          onClick={onGo}
          className="group w-full md:w-auto flex items-center justify-center gap-4 rounded-full bg-black px-12 py-6 text-[13px] font-black uppercase tracking-[0.15em] text-ink transition-all hover:scale-[1.05]"
        >
          {theme.action}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={onRestart}
          className="text-[11px] font-black uppercase tracking-widest text-black/50 hover:text-green transition"
        >
          Ignore Recommendation
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VectorMapFallback({ theme, generatedOutput, onRestart, reason, cityPack }: any) {
  return (
    <div className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[3rem] bg-[#0A0C10] text-white border border-white/5">
      <div className="absolute inset-0 opacity-40">
        <svg width="100%" height="100%">
          <rect
            width="100%"
            height="100%"
            fill={`radial-gradient(circle, ${theme.primary}22 0%, transparent 70%)`}
          />
          {[...Array(6)].map((_, i) => (
            <motion.path
              key={i}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.15 }}
              transition={{ duration: 2, delay: i * 0.2 }}
              d={`M ${400 + (Math.random() - 0.5) * 400} ${300 + (Math.random() - 0.5) * 300} L 400 300`}
              stroke="white"
              strokeWidth="1"
              fill="none"
            />
          ))}
          <motion.circle
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            cx="50%"
            cy="50%"
            r="30"
            fill={theme.primary}
          />
          <circle cx="50%" cy="50%" r="6" fill="white" />
        </svg>
      </div>

      <div className="relative z-10 p-10 flex flex-col h-full justify-between flex-1">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
              Decision Vector
            </p>
            <h5 className="text-3xl font-bold tracking-tight">{generatedOutput.subNode}</h5>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              {reason}
            </p>
          </div>
          {/* City name badge — bound to cityPack.name */}
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {cityPack.name.toUpperCase()} LIVE
          </div>
        </div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full md:w-[400px] rounded-[2.5rem] bg-[#16181D] border border-white/10 p-8 shadow-2xl backdrop-blur-3xl"
        >
          <p className="text-lg font-medium leading-snug mb-8">
            HADE has activated the {generatedOutput.subNode} node based on your current signal.
          </p>
          <div className="flex gap-4">
            <button className="flex-[2] py-5 rounded-2xl bg-white text-ink font-black text-[11px] uppercase tracking-widest">
              Let's Go
            </button>
            <button
              onClick={onRestart}
              className="flex-1 py-5 rounded-2xl bg-white/5 font-bold text-[11px] uppercase tracking-widest text-white/40"
            >
              Exit
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TacticalMapStep({ signal, generatedOutput, onRestart, cityPack }: any) {
  const theme = MODULE_THEMES[signal.moduleContext as ModuleContext];
  // Consume live HADE context for the Pivot Scanner — no prop drilling required.
  const { context: hadeContext } = useHadeCtx();

  // Vite-compatible env var: supports both VITE_ prefix and NEXT_PUBLIC_ legacy naming
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleMapsApiKey = (
    (import.meta.env as Record<string, string>).VITE_GOOGLE_MAPS_API_KEY ||
    (import.meta.env as Record<string, string>).NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );

  const { isLoaded, loadError } = useJsApiLoader({
    id: "hade-google-maps",
    googleMapsApiKey,
  });

  // Map centre falls back to the city's own coordinates — no hardcoded city
  const cityCenter = { lat: cityPack.coordinates.lat, lng: cityPack.coordinates.lng };

  const [center, setCenter] = useState<{ lat: number; lng: number }>(cityCenter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  useEffect(() => {
    if (!generatedOutput?.subNode) {
      setCenter(cityCenter);
      return;
    }

    if (!isLoaded || !(window as any).google?.maps?.Geocoder) {
      setCenter(cityCenter);
      return;
    }

    let cancelled = false;
    setIsResolvingLocation(true);

    // Ground the geocode query in the live city name — prevents cross-city mismatches
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode(
      { address: `${generatedOutput.subNode}, ${signal.location}` },
      (results: any, status: string) => {
        if (cancelled) return;
        setIsResolvingLocation(false);

        if (status === "OK" && results?.[0]?.geometry?.location) {
          const point = results[0].geometry.location;
          setCenter({ lat: point.lat(), lng: point.lng() });
          return;
        }

        setCenter(cityCenter);
      },
    );

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedOutput?.subNode, isLoaded]);

  useEffect(() => {
    if (!mapInstance || !center) return;
    mapInstance.panTo(center);
  }, [center, mapInstance]);

  // ── Pivot Scanner: pan map to an alternative neighborhood ─────────────────
  // Called by PivotScannerFAB when the user taps 'Pivot Here →'.
  // Reuses the same geocoding pattern as the subNode resolver above.
  const handlePivotTo = useCallback((neighborhoodName: string) => {
    if (!isLoaded || !(window as any).google?.maps?.Geocoder) return;
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode(
      { address: `${neighborhoodName}, ${signal.location}` },
      (results: any, status: string) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const point = results[0].geometry.location;
          setCenter({ lat: point.lat(), lng: point.lng() });
        }
      },
    );
  }, [isLoaded, signal.location]);

  if (!googleMapsApiKey) {
    return (
      <VectorMapFallback
        theme={theme}
        generatedOutput={generatedOutput}
        onRestart={onRestart}
        cityPack={cityPack}
        reason="Google Maps key missing. Using vector fallback."
      />
    );
  }

  if (loadError) {
    return (
      <VectorMapFallback
        theme={theme}
        generatedOutput={generatedOutput}
        onRestart={onRestart}
        cityPack={cityPack}
        reason="Google Maps load failed. Using vector fallback."
      />
    );
  }

  if (!isLoaded) {
    return (
      <VectorMapFallback
        theme={theme}
        generatedOutput={generatedOutput}
        onRestart={onRestart}
        cityPack={cityPack}
        reason="Loading map layer..."
      />
    );
  }

  return (
    <div className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[3rem] bg-[#0A0C10] text-white border border-white/5">
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerClassName="h-full w-full"
          zoom={13.5}
          center={center}
          onLoad={(map) => setMapInstance(map)}
          options={{
            disableDefaultUI: true,
            clickableIcons: false,
            gestureHandling: "greedy",
            minZoom: 11,
            maxZoom: 16,
            styles: GOOGLE_MAP_DARK_STYLE,
            backgroundColor: "#0A0C10",
          }}
        >
          <OverlayView position={center} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative -translate-x-1/2 -translate-y-1/2"
            >
              <motion.div
                animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
                transition={{ repeat: Infinity, duration: 1.9, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: `${theme.primary}55` }}
              />
              <div
                className="relative rounded-2xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-xl"
                style={{
                  borderColor: `${theme.primary}88`,
                  color: "white",
                  background: "rgba(10,12,16,0.88)",
                  boxShadow: `0 12px 32px ${theme.primary}44`,
                }}
              >
                {generatedOutput.subNode}
              </div>
            </motion.div>
          </OverlayView>
        </GoogleMap>
      </div>

      <div className="relative z-10 p-10 flex flex-col h-full justify-between flex-1">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
              Decision Vector
            </p>
            <h5 className="text-3xl font-bold tracking-tight">{generatedOutput.subNode}</h5>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              {isResolvingLocation ? "Resolving neighborhood..." : "Google Maps Synced"}
            </p>
          </div>
          {/* City name badge — bound to cityPack.name */}
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {cityPack.name.toUpperCase()} LIVE
          </div>
        </div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-10 right-10 w-[320px] rounded-[2rem] bg-[#16181D]/90 border border-white/10 p-6 shadow-2xl backdrop-blur-2xl"
        >
          <p className="text-lg font-medium leading-snug mb-4">
            HADE has activated the {generatedOutput.subNode} node based on your current signal.
          </p>
          <div className="flex gap-3">
            <button className="flex-[2] py-3 rounded-2xl bg-white text-ink font-black text-[11px] uppercase tracking-widest">
              Let's Go
            </button>
            <button
              onClick={onRestart}
              className="flex-1 py-3 rounded-2xl bg-white/5 font-bold text-[11px] uppercase tracking-widest text-white/40"
            >
              Exit
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Pivot Scanner FAB — fixed bottom-right, renders above the map ── */}
      <PivotScannerFAB
        cityPack={cityPack}
        hadeContext={hadeContext}
        themeColor={theme.primary}
        onPivotTo={handlePivotTo}
      />
    </div>
  );
}

// ─── Ambient (Zero-Tap) output builder ────────────────────────────────────────
// Converts the first HadeRecommendation from the deterministic engine into the
// GeneratedOutput shape used by ResultStep. Called synchronously on mount so the
// result card is always populated before the first paint.

function buildAmbientOutput(
  context: HadeContext,
  safeFirstNeighborhood: string,
): GeneratedOutput {
  const recs = getHadeRecommendations(context, safeFirstNeighborhood);
  const primary = recs[0];
  return {
    keyword:     primary?.title       ?? 'Discovery',
    description: primary?.description ?? `Begin in ${safeFirstNeighborhood}.`,
    subNode:     safeFirstNeighborhood,
    tags:        ['deterministic', 'instant', 'engine-driven'],
  };
}

// ─── LLM Timing Config ────────────────────────────────────────────────────────
// Single source of truth for per-LLM animation durations. Referenced by both
// the ProcessingStep `duration` prop and the Claude safety-gap delay in
// handleExplore so the two sites can never drift apart.

const LLM_TIMING_MS: Record<LlmChoice, number> = {
  gemini: 3200,
  claude: 1800,
  llama: 0,
} as const;

const CLAUDE_SAFETY_GAP_MS = 150;

// ─── Main Controller ──────────────────────────────────────────────────────────

export default function HadeEngine({ cityPack, accent, className }: HadeEngineProps) {
  // Consume the shared HADE context — arrival stage drives the initial module seed
  // and the engine-aligned fallback description.
  const { context: hadeContext } = useHadeCtx();

  const [isAmbientResult, setIsAmbientResult] = useState(true);
  const [step, setStep] = useState<StepId>("result");

  // Seed location AND moduleContext from cityPack/hadeContext on first render.
  // hadeContext is already initialised from localStorage by useHadeContext — no
  // direct localStorage read needed here.
  const [signal, setSignal] = useState<SignalState>(() => ({
    ...DEFAULT_SIGNAL,
    location: `${cityPack.name}, ${cityPack.countryName}`,
    moduleContext:
      hadeContext.arrivalStage === "landed" || hadeContext.arrivalStage === "in_transit"
        ? "weather-vibe"   // City Pulse: what's around me right now?
        : "the-wildcard",  // spontaneous discovery mode
  }));

  // Seed the fallback subNode from the city's safest neighbourhood
  const safeFirstNeighborhood = (() => {
    const ns = cityPack.neighborhoods;
    if (!ns || ns.length === 0) return cityPack.name;
    return ns.reduce((best, n) => (n.safetyScore > best.safetyScore ? n : best)).name;
  })();

  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput>(() =>
    buildAmbientOutput(hadeContext, safeFirstNeighborhood),
  );

  const [timerDone, setTimerDone] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const exploreStartRef = useRef<number>(0);

  const theme = MODULE_THEMES[signal.moduleContext];
  const themeColor = accent ?? theme.primary;

  // Keep ambient output in sync with micro-feedback signal changes. This lets
  // feedback buttons immediately affect the next recommendation cycle.
  useEffect(() => {
    if (!isAmbientResult || step !== "result") return;
    setGeneratedOutput(buildAmbientOutput(hadeContext, safeFirstNeighborhood));
  }, [hadeContext, isAmbientResult, safeFirstNeighborhood, step]);

  // Advance from processing → result once both the animation timer AND data are ready.
  // Llama exits immediately; Claude uses its own setTimeout path in handleExplore.
  const handleTimerComplete = useCallback(() => {
    if (step === "processing") setTimerDone(true);
  }, [step]);

  useEffect(() => {
    if (step === "processing" && dataReady) {
      if (signal.llmChoice === "llama") {
        setStep("result");
      } else if (signal.llmChoice !== "claude" && timerDone) {
        setStep("result");
      }
    }
  }, [step, dataReady, timerDone, signal.llmChoice]);

  // Release the interaction lock once the result transition is initiated
  useEffect(() => {
    if (step === "result") setIsLoading(false);
  }, [step]);

  const buildClientFallback = useCallback((inputSignal: string): GeneratedOutput => {
    // Pull the engine-aligned description so the offline fallback matches what
    // HadeDecisionCard already shows — no parallel heuristic divergence.
    const recs = getHadeRecommendations(hadeContext, safeFirstNeighborhood);
    const primary = recs[0];
    return {
      keyword: extractHighSignalWord(inputSignal),
      description:
        primary?.description ??
        `Start in ${safeFirstNeighborhood} where conditions are usually easiest for first movement.`,
      subNode: safeFirstNeighborhood,
      tags: ["offline", "engine-aligned", "instant"],
    };
  }, [hadeContext, cityPack, safeFirstNeighborhood]);

  const applyHeuristicFallback = useCallback((inputSignal: string): boolean => {
    try {
      setGeneratedOutput(buildClientFallback(inputSignal));
      setIsAmbientResult(false);
      setDataReady(true);
      setStep("result");
      setIsLoading(false);
      return true;
    } catch (fallbackError) {
      console.warn("[HADE Engine] Heuristic fallback failed.", fallbackError);
      return false;
    }
  }, [buildClientFallback]);

  // ─── handleExplore ──────────────────────────────────────────────────────────

  const handleExplore = useCallback(async () => {
    if (isLoading) return;

    setApiError(null);
    exploreStartRef.current = Date.now();
    setTimerDone(false);
    setDataReady(false);
    setIsLoading(true);
    setStep("processing");

    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

    // Offline path: try IDB cache first, then client heuristic
    if (!isOnline) {
      try {
        const cached = await getHadeInsight(cityPack.slug);
        if (cached) {
          setGeneratedOutput(toGeneratedOutput(cached, safeFirstNeighborhood));
          setDataReady(true);
          setStep("result");
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("[HADE Engine] IDB read failed (offline path).", err);
      }
      if (applyHeuristicFallback(signal.combinedSignal)) return;
      setStep("result");
      setIsLoading(false);
      setApiError("The HADE engine is offline. Please try again.");
      return;
    }

    try {
      const output = await callHadeApi(
        { combinedSignal: signal.combinedSignal, moduleContext: signal.moduleContext },
        cityPack,
        hadeContext,
      );

      setGeneratedOutput(output);
      setIsAmbientResult(false);
      setDataReady(true);

      // Llama fast-path: bypass timer gate immediately
      if (signal.llmChoice === "llama") {
        setStep("result");
        setTimerDone(true);
        setIsLoading(false);
      } else if (signal.llmChoice === "claude") {
        // Claude medium-path: ensure at least LLM_TIMING_MS.claude display time,
        // then CLAUDE_SAFETY_GAP_MS before advancing — synced with ProcessingStep duration.
        const elapsed = Date.now() - exploreStartRef.current;
        const delay = Math.max(0, LLM_TIMING_MS.claude - elapsed) + CLAUDE_SAFETY_GAP_MS;
        setTimeout(() => {
          setStep("result");
          setTimerDone(true);
          setIsLoading(false);
        }, delay);
      }
      // Gemini: useEffect gate advances via dataReady + timerDone — no action here
    } catch (error) {
      console.warn("[HADE Engine] Fetch failed. Trying IDB before heuristic fallback.", error);

      // Fetch error path: try IDB, then client heuristic
      try {
        const cached = await getHadeInsight(cityPack.slug);
        if (cached) {
          setGeneratedOutput(toGeneratedOutput(cached, safeFirstNeighborhood));
          setStep("result");
          setIsLoading(false);
          return;
        }
      } catch (cacheErr) {
        console.warn("[HADE Engine] IDB read failed after fetch error.", cacheErr);
      }

      if (applyHeuristicFallback(signal.combinedSignal)) return;

      // All paths exhausted — API + IDB + heuristic fallback failed
      setStep("result");
      setIsLoading(false);
      setApiError("The HADE engine couldn't reach the API. Please try again.");
    }
  }, [
    applyHeuristicFallback,
    cityPack,
    hadeContext,
    isLoading,
    safeFirstNeighborhood,
    signal.llmChoice,
    signal.combinedSignal,
    signal.moduleContext,
  ]);

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const restart = () => {
    setIsAmbientResult(true);
    setStep("result");
    setGeneratedOutput(buildAmbientOutput(hadeContext, safeFirstNeighborhood));
    setSignal({
      ...DEFAULT_SIGNAL,
      location: `${cityPack.name}, ${cityPack.countryName}`,
      // Re-read arrival stage from live context — stage may have changed since mount
      moduleContext:
        hadeContext.arrivalStage === "landed" || hadeContext.arrivalStage === "in_transit"
          ? "weather-vibe"
          : "the-wildcard",
    });
    setTimerDone(false);
    setDataReady(false);
    setIsLoading(false);
    setApiError(null);
  };

  const safeOutput =
    generatedOutput.keyword && generatedOutput.description && generatedOutput.subNode
      ? generatedOutput
      : { keyword: "Discovery", description: "", subNode: safeFirstNeighborhood, tags: [] };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className={`w-full py-12 px-6 md:px-0 mx-auto max-w-7xl ${className ?? ""}`}>
      <div className="mb-12 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-ink/5 bg-ink/[0.02] px-6 py-2 mb-6">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: themeColor }} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/60">
            Spontaneity Engine v4.2
          </p>
        </div>
        <h2 className="text-5xl md:text-6xl font-bold tracking-tighter">HADE Orchestration</h2>
      </div>

      <AnimatePresence>
        {apiError && (step === "result" || step === "input") && (
          <motion.div
            key="api-error-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mb-4 rounded-2xl border border-red-200/60 bg-red-50/80 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-red-500 backdrop-blur-sm"
          >
            ⚠ Engine Offline — {apiError}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        >
          {step === "processing" && (
            <ProcessingStep
              key={`processing-${signal.llmChoice}`}
              signal={signal}
              onComplete={handleTimerComplete}
              duration={LLM_TIMING_MS[signal.llmChoice]}
            />
          )}
          {step === "result" && (
            <>
              <ResultStep
                signal={signal}
                generatedOutput={safeOutput}
                onRestart={restart}
                onGo={() => {
                  appendExploredNode(cityPack.slug, safeOutput.subNode);
                  setStep("mapping");
                }}
                cityPack={cityPack}
              />
              <AiRefinePanel
                signal={signal}
                setSignal={setSignal}
                onExplore={() => { void handleExplore(); }}
                isLoading={isLoading}
              />
            </>
          )}
          {step === "mapping" && (
            <TacticalMapStep
              signal={signal}
              generatedOutput={safeOutput}
              onRestart={restart}
              cityPack={cityPack}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Step progress indicators */}
      <div className="mt-12 flex justify-center gap-3">
        {(["processing", "result", "mapping"] as StepId[]).map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-700 ${
              step === s ? "w-12" : "w-3 bg-ink/10"
            }`}
            style={{ backgroundColor: step === s ? themeColor : undefined }}
          />
        ))}
      </div>
    </section>
  );
}
