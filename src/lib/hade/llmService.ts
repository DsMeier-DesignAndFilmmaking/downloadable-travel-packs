/**
 * llmService — thin network layer for the HADE LLM API.
 *
 * Responsibility: build the request payload, call /api/generate-hade,
 * validate the response shape, persist to IndexedDB (fire-and-forget),
 * and return a flat GeneratedOutput ready for the UI.
 *
 * Does NOT handle: offline detection, IDB read-cache fallback, or
 * heuristic fallback — those remain in HadeEngine.tsx as UI concerns.
 */

import type { CityPack, HadeContext } from '@/types/cityPack';
import {
  saveHadeInsight,
  type HadeDecisionResponse,
} from '@/utils/cityPackIdb';

// ─── Exported types ────────────────────────────────────────────────────────────

export type ModuleContext =
  | 'weather-vibe'
  | 'expert-network'
  | 'mood-journey'
  | 'meet-someone'
  | 'the-wildcard';

/** Flat display-layer type consumed by HadeEngine's multi-step UI. */
export interface GeneratedOutput {
  keyword: string;
  description: string;
  subNode: string;
  tags: string[];
}

// ─── Internal types ────────────────────────────────────────────────────────────

interface HadeRequestPayload {
  signal: string;
  module: ModuleContext;
  location: string;
  neighborhoods: string[];
  cityData: {
    name: string;
    theme: string;
    neighborhoods: Array<{
      name: string;
      vibe: string;
      safetyScore: number;
    }>;
    survival: {
      tipping: string;
      tapWater: string;
      currentScams: string[];
    };
    real_time_hacks: string[];
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isValidHadeResponse(value: unknown): value is HadeDecisionResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const primary = record.primary as Record<string, unknown> | undefined;
  return (
    typeof primary?.keyword === 'string' &&
    typeof primary?.description === 'string' &&
    typeof primary?.subNode === 'string' &&
    Array.isArray(record.tags) &&
    (record.tags as unknown[]).every((t) => typeof t === 'string')
  );
}

/**
 * Converts a HadeDecisionResponse (nested API shape) to the flat
 * GeneratedOutput shape used by the UI. `fallbackNode` is used when
 * the API returns an empty subNode field.
 */
export function toGeneratedOutput(
  response: HadeDecisionResponse,
  fallbackNode: string,
): GeneratedOutput {
  return {
    keyword: response.primary.keyword.trim() || 'Discovery',
    description: response.primary.description.trim(),
    subNode: response.primary.subNode.trim() || fallbackNode,
    tags: response.tags.slice(0, 4),
  };
}

function deriveFallbackNode(cityPack: CityPack): string {
  const ns = cityPack.neighborhoods;
  if (!ns || ns.length === 0) return cityPack.name;
  return ns.reduce((best, n) => (n.safetyScore > best.safetyScore ? n : best)).name;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Calls /api/generate-hade with the given signal and city context.
 *
 * On success: persists the raw payload to IndexedDB (fire-and-forget)
 * and returns a GeneratedOutput ready for the UI.
 *
 * Throws on: network error, non-2xx HTTP status, or invalid response shape.
 * The caller (HadeEngine) is responsible for IDB read-cache and heuristic fallback.
 */
export async function callHadeApi(
  signal: { combinedSignal: string; moduleContext: ModuleContext },
  cityPack: CityPack,
  // hadeContext included for future prompt enrichment; not yet used in payload.
  _hadeContext: HadeContext,
): Promise<GeneratedOutput> {
  const mappedNeighborhoods = cityPack.neighborhoods.map((n) => ({
    name: n.name,
    vibe: n.vibe,
    safetyScore: n.safetyScore,
  }));

  const requestPayload: HadeRequestPayload = {
    signal: signal.combinedSignal,
    module: signal.moduleContext,
    location: cityPack.name,
    neighborhoods: mappedNeighborhoods.map((n) => n.name),
    cityData: {
      name: cityPack.name,
      theme: cityPack.theme,
      neighborhoods: mappedNeighborhoods,
      survival: {
        tipping: cityPack.survival.tipping,
        tapWater: cityPack.survival.tapWater,
        currentScams: cityPack.survival.currentScams,
      },
      real_time_hacks: cityPack.real_time_hacks ?? [],
    },
  };

  console.log('[HADE LLM] Pre-flight payload:', JSON.stringify(requestPayload));

  const res = await fetch('/api/generate-hade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload),
  });

  if (!res.ok) throw new Error(`HADE request failed (${res.status})`);

  const payload = (await res.json()) as unknown;
  if (!isValidHadeResponse(payload)) {
    throw new Error('Invalid HADE response shape from /api/generate-hade');
  }

  // Persist to IDB in the background — don't block the UI transition.
  void saveHadeInsight(cityPack.slug, payload).catch((err) => {
    console.warn('[HADE LLM] IDB write failed. UI remains live.', err);
  });

  return toGeneratedOutput(payload, deriveFallbackNode(cityPack));
}
