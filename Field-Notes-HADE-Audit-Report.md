# Field Notes — HADE Integration Audit Report

**Project:** Downloadable Travel Packs ("Field Notes")
**Project Path:** `/Users/danielmeier/Desktop/Downloadable_Travel-Packs`
**Audit Date:** March 18, 2026
**Auditor:** Claude Code (AI System Architect)
**Scope:** Audit-Only — No Changes Made
**Purpose:** Evaluate current system state and HADE Spontaneity Engine integration potential

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Data Models & Flow](#2-data-models--flow)
3. [Integration Potential (HADE / Spontaneity Engine)](#3-integration-potential-hade--spontaneity-engine)
4. [UX & Feature Notes](#4-ux--feature-notes)
5. [Technical Constraints](#5-technical-constraints)
6. [Summary & Recommendations](#6-summary--recommendations-audit-only)
7. [Appendix: File Reference Map](#appendix-file-reference-map)

---

## 1. High-Level Architecture

### System Type

- **Classification:** Progressive Web App (PWA), offline-first, client-rendered SPA
- **Architecture Pattern:** JAMstack — static-first with serverless API augmentation
- **Rendering Model:** Client-Side Rendering (CSR) via React + Vite (no SSR)
- **Deployment:** Vercel (CDN + Serverless Functions)
- **Platform:** Web-only (browser + PWA installable on iOS/Android home screen)

### Core Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.3.1 |
| Routing | React Router DOM | 7.13.0 |
| Styling | Tailwind CSS | 4.1.18 |
| Animation | Framer Motion | 12.34.0 |
| PWA | vite-plugin-pwa | 1.2.0 |
| Offline Storage | IndexedDB (custom wrapper) | Browser API |
| HTTP Client | Axios | 1.13.5 |
| Analytics | PostHog | 1.352.0 |
| Search | Fuse.js | 7.1.0 |
| Deployment | Vercel (Serverless Node.js) | @vercel/node 5.6.3 |

### Key Modules / Components

1. **City Pack Engine** — Core data module; loads, caches, and serves city guide content
2. **Arrival Intelligence Module** — Multi-stage tactical guide (pre-arrival → immigration → airport exit → left airport)
3. **Environmental Impact Block** — Live AQI, pollen, overtourism metrics via Google APIs
4. **Live City Pulse** — Real-time traffic, weather, incident overlay (Google Maps Platform)
5. **Compliance Autopilot** — Automated Schengen 90/180-day and ETIAS visa tracking
6. **SpontaneityEnginePromo** — Placeholder UI component (Coming Soon) — primary HADE touchpoint
7. **Offline Manager** — IndexedDB read/write, storage quota monitoring
8. **Service Worker (v9)** — Multi-layer caching, shell/data separation, offline fallback
9. **Analytics Layer** — PostHog event tracking (installs, city views, CTA clicks)
10. **Facility Kit** — OpenStreetMap Overpass-powered nearest restroom finder

### Deployment Setup

- **Platform:** Vercel (CDN-distributed static assets + serverless functions)
- **Serverless API routes:** `/api/manifest`, `/api/city-vitals`, `/api/visa-check`, `/api/suggest-city`, `/api/vitals/environmental-impact`, `/api/vitals/google-pulse`
- **URL Rewrites:** `/guide/:slug*` → `/index.html` (SPA fallback); `/api/manifest/:slug` → `/api/manifest?slug=:slug`
- **Service Worker:** Manually registered from `CityGuideView.tsx`; cache versioned at `travel-guide-shell-v9`
- **No Docker, no CI/CD pipeline found** — deploy via Vercel Git integration (implied)
- **Local Dev:** Vite dev server with mock manifests served from `/public/mock/manifest/`

---

## 2. Data Models & Flow

### Data Inputs

| Input Type | Source | Freshness | Offline-Safe |
|---|---|---|---|
| City pack content (static) | Bundled `/src/data/cities.json` | Build-time | Yes |
| Air Quality Index (live) | Google Air Quality API | Real-time | Fallback to baseline |
| Pollen data (live) | Google Pollen API | Real-time | Fallback to baseline |
| Traffic flow (live) | TomTom API / Google Maps Platform | Real-time | No fallback |
| Weather data (live) | Open-Meteo (free, no auth) | Real-time | No fallback |
| Visa requirements (live) | RapidAPI (visa-requirement.p.rapidapi.com) | Real-time | Cached 6h in-memory |
| Seasonal baselines | `/public/data/seasonal-baseline.json` | Build-time | Yes |
| Environmental baselines | `city-vitals` serverless function | Per-request | No fallback |
| User airport selection | localStorage | Session-persistent | Yes |
| Nearest restroom location | OpenStreetMap Overpass API | Real-time | No |
| User travel history (Compliance) | User-entered in UI | Session | LocalStorage |

### Core Data Model: `CityGuide` (alias: `CityPack`)

The primary TypeScript interface (`src/types/cityPack.ts`) defines the following structure:

```
CityGuide {
  slug, name, countryCode, countryName, currencyCode
  coordinates { lat, lng }
  last_updated (ISO string)
  theme (string — one-line city narrative)

  emergency {
    police, medical, pharmacy24h, ambulance, tourist_police, health_note
  }

  survival {
    tipping, tapWater, power, digitalEntry, touristTax, currentScams[]
  }

  arrival {
    eSimAdvice, eSimHack, airportHack, transitHack
    essentialApps[], tacticalPath, borderStatus
    first60Protocol[], arrivalMistakes[]
    transportMatrix, systemHealth
  }

  neighborhoods[]   { name, vibe, safetyScore (1–10) }
  transit           { bestWay, rideShare, transitCard, warning }
  facility_intel    { access, hygiene, protocol, availability }
  fuel              { staple, intel, price_anchor, price_usd, availability, sources[] }
  safety_intelligence { crimeStatsUrl, crimeStatsSource, safetyLevel }
  survival_kit      { tap_water, power_plug, tipping, toilets }
  transit_logic     { primary_app, payment_method, etiquette, micromobility_alert }
  scam_alerts[], real_time_hacks[], basic_needs {}
}
```

### Data Outputs (What Field Notes Renders)

- **City pack sections:** Full rendered guide (survival, arrival, transit, environmental, safety)
- **Environmental impact narrative:** AQI category + city-specific action copy + overtourism index
- **Visa status badges:** Entry requirement summary (live or cached)
- **Transport matrix:** Cheapest vs. comfort options table per airport
- **First 60 Protocol:** Ordered checklist of arrival steps
- **Neighborhood vibes:** Safety-scored grid of local areas
- **Scam alert ticker:** Scrolling horizontal list of active scam types
- **City pulse block:** Live traffic delay, weather, incident status
- **Compliance status:** Schengen 90/180 remaining days + ETIAS expiry countdown
- **SpontaneityEnginePromo:** Static "Coming Soon" promotional card (no live data output)

### Offline Storage Strategy

| Layer | Store | Contents |
|---|---|---|
| IndexedDB | `travel-packs-db` / `city-packs` | Full `CityPack` object + `savedAt` timestamp, keyed by slug |
| Service Worker Shell Cache | `travel-guide-shell-v9` | HTML, CSS, JS bundles, icons, baseline JSON |
| Service Worker Image Cache | `guide-images-v6` | Separate image cache |
| LocalStorage | — | User preferences, airport selections, onboarding state, last viewed pack path |
| SessionStorage | — | PostHog session IDs, debug flags |

**IndexedDB API:** `saveGuide()`, `getGuide()`, `getAllGuides()`, `deleteGuide()`, `getCacheSizeInfo()`

### Dynamic vs. Static Content

| Content | Type | API Dependency |
|---|---|---|
| Emergency numbers | Static (bundled) | None |
| Survival tips / scam alerts | Static (bundled) | None |
| Arrival tactics / First 60 Protocol | Static (bundled) | None |
| Neighborhood safety scores | Static (bundled) | None |
| Air Quality Index | Dynamic | Google Air Quality API |
| Pollen bands | Dynamic | Google Pollen API |
| Visa status | Dynamic | RapidAPI (6h cache) |
| Weather (temp, UV) | Dynamic | Open-Meteo |
| Traffic delay | Dynamic | TomTom / Google Maps |
| Overtourism index | Dynamic (computed) | Google AQI + custom calculation |
| City pulse copy | Dynamic | `/api/vitals/google-pulse` |

---

## 3. Integration Potential (HADE / Spontaneity Engine)

### Current HADE / Spontaneity Engine References

- **`src/components/SpontaneityEnginePromo.tsx`** — the only HADE-related code in the entire repo
  - **Status:** "COMING SOON" promotional placeholder — zero backend logic, no API hooks, no data contracts
  - **Placements:** Homepage (after 2nd city card) and `CityGuideView` (footer section)
  - **Copy:** *"Sync with the city's live rhythm and discover local secrets for those unplanned detours that become your best stories"*
  - **CTA:** Links to external portfolio site only; no internal data pipeline
- **No "HADE" string found anywhere in the codebase** (confirmed via full-text search)
- **`ComplianceAutopilot`** is the closest existing autonomous logic and could serve as a UI pattern reference for how HADE slots into the interface

### Context Field Notes Can Provide to HADE

| Context Category | Available Fields | Quality |
|---|---|---|
| Location | `coordinates.lat/lng`, city slug, `countryCode` | High |
| Neighborhood | `neighborhoods[].name`, `.vibe`, `.safetyScore` | High |
| Environmental | Live AQI, pollen bands, UV index, overtourism index | Medium (API-dependent) |
| Transit State | `transit_logic.primary_app`, `bestWay`, `rideShare`, traffic delay % | Medium |
| Time | `last_updated`, seasonal baselines, time-of-day (client clock) | Low–Medium |
| Cost Anchors | `fuel.price_usd`, `transportMatrix` fare tiers, `touristTax` | High |
| Safety State | `scam_alerts[]`, `safety_intelligence.safetyLevel`, `neighborhoods[].safetyScore` | High |
| Arrival Stage | `landed_{slug}` localStorage key tracks arrival progression stage | Medium |
| User Preferences | Airport selection, last viewed pack, Schengen travel history | Low |
| Behavioral | PostHog event stream (city views, CTA interactions) | Medium (analytics only) |

### Gaps — Context Missing for HADE Accuracy

The following context is **not currently available** in Field Notes and would need to be added or passed separately:

1. **Real-time GPS location** — No live location tracking; only city-level coordinates exist
2. **Time of day / day of week** — Available via client clock but not stored or passed to any backend
3. **User intent / activity preference** — No preference profile (food, culture, adventure, etc.)
4. **Duration remaining in city** — Travel dates and departure not tracked anywhere
5. **Visited locations** — No visited-places tracking within a city
6. **Personal spending bracket** — Only city-wide cost anchors; no user budget preference
7. **Real-time events** — No local events API (concerts, festivals, markets, closures)
8. **Social signals** — No crowdsourcing, reviews, or trending spot data
9. **Weather-activity match** — Weather data exists but not cross-referenced against activity types
10. **Multi-city trip context** — No trip itinerary concept; each city is an independent island

### Potential Integration Architecture

**Strategy A: Embedded Widget**
HADE renders inside the `SpontaneityEnginePromo` card space as an API-fed recommendation block. Field Notes passes city context as a JSON payload to a HADE endpoint. The natural injection point is the existing `SpontaneityEnginePromo` slot in `CityGuideView.tsx`.

**Strategy B: Context Provider**
Field Notes exposes a `HADEContext` object (location, arrival stage, AQI, neighborhood, transit state) via a shared interface. HADE's engine consumes this to generate recommendations; results render in the reserved promo slot. This enables cleaner separation of concerns and is the more architecturally sound approach.

---

## 4. UX & Feature Notes

### Current Content Delivery

- **Primary delivery:** Web browser (Vercel-hosted), accessed on any device
- **Offline delivery:** PWA installed to home screen → Service Worker serves shell + IndexedDB serves data
- **Content format:** Long-scroll single-page city guide, sectioned by topic (arrival, survival, transit, environmental, etc.)
- **Interaction model:** Read-heavy; minimal interactive components (airport selector, compliance tracker, scan-on-tap)
- **Navigation:** Single route per city (`/guide/:slug`), homepage is catalog
- **Download model:** User manually syncs city to offline cache via "Save Offline" button (not automatic)

### UX Considerations for HADE Integration

- **Contextual placement:** `SpontaneityEnginePromo` is positioned at the bottom of `CityGuideView` — low visibility; HADE recommendations would need a higher-priority slot for real-time utility
- **Content density:** City guides are already information-dense; HADE recommendations must be concise (card format, not paragraphs)
- **Offline conflict:** If HADE requires live API calls, recommendations will silently fail when offline — no fallback content is defined
- **Trust signals:** Users rely on Field Notes for safety-critical info; HADE recommendations need to clearly differentiate curated content from AI-generated suggestions
- **Arrival stage awareness:** The `landed_{slug}` state machine (pre-arrival → left airport) could trigger HADE differently at each stage — airport advice vs. neighborhood exploration
- **PWA standalone UX:** When used as an installed PWA there is no browser chrome — recommendations must be self-contained and not require external browser navigation
- **Mobile font sizing:** Base font increases 15% on mobile; HADE card components must be designed mobile-first

### Offline-First Impact on Live Recommendations

- **Critical gap:** HADE recommendations are inherently real-time; offline users receive no new recommendations
- **Stale data risk:** A cached city pack may be days or weeks old; HADE context derived from stale data could produce inaccurate recommendations
- **No graceful HADE fallback:** Currently `SpontaneityEnginePromo` shows static text when offline — this needs extending to handle "no live HADE available" gracefully
- **Service worker does not cache API responses:** HADE recommendation responses would need an explicit caching strategy added to `sw.ts`

---

## 5. Technical Constraints

### Dependencies & Integration Risk

| Dependency | Role | Risk for HADE |
|---|---|---|
| Vite + React Router | SPA routing, build | Low (stable) |
| Vercel Serverless | API endpoints | Medium (cold starts, 10s timeout limit) |
| IndexedDB | Offline city data | Low (established pattern) |
| Service Worker v9 | Shell/asset caching | Medium (HADE responses not in current cache scope) |
| Google APIs (AQI, Pollen, Maps) | Live environmental data | Medium (cost, quota limits) |
| RapidAPI (Visa) | Visa requirement lookup | Medium (third-party, 6h cache only) |
| PostHog | Analytics | Low |
| TomTom API | Traffic data | Low (legacy/optional) |
| Open-Meteo | Weather (free, no auth) | Low |
| OpenStreetMap Overpass | Restroom finding | Low (rate-limited for heavy use) |

### Current System Limitations

1. **Web-only:** No native iOS/Android app — PWA lacks native APIs (background sync, push notifications, GPS)
2. **No background sync:** Service worker does not implement Background Sync API — data only refreshes on foreground page load
3. **No authentication:** Zero user identity/auth system — HADE personalization is impossible across devices
4. **No database:** Stateless serverless functions + client-side IDB only — no server-side user state
5. **No real-time WebSocket connections:** All data is pull-based (fetch); no push capability
6. **Single-user, single-device:** State lives in localStorage/SessionStorage — no cross-device sync
7. **No trip planner concept:** Cities are standalone; no itinerary, date range, or trip-level context
8. **Static AI copy only:** `actionViaAnalysisContent.ts` contains pre-written city narratives — not AI-generated at runtime
9. **Vercel cold starts:** Serverless functions can introduce 1–3s latency on first call — problematic for real-time HADE fetches
10. **No CORS policy defined:** No explicit CORS handling in `vercel.json` — could block cross-origin HADE requests

### Work Required for HADE Integration

| Area | Required Work | Complexity |
|---|---|---|
| API endpoint | New `/api/hade-recommend` or proxy to HADE service | Low |
| Authentication | User identity layer (OAuth, anonymous session tokens) for personalization | High |
| Context payload | Standardized JSON schema to pass city state to HADE | Medium |
| Offline fallback | Graceful degradation when HADE is unreachable offline | Medium |
| Service worker cache | Cache HADE responses for offline replay | Medium |
| Data formatting | Transform `CityPack` fields to HADE's expected input format | Medium |
| UI injection point | Upgrade `SpontaneityEnginePromo` to a live data-connected component | Low |
| Arrival stage hooks | Pass current `arrivalStage` to HADE for stage-aware recommendations | Low |
| GPS/location | Add browser Geolocation API for real-time within-city positioning | Medium |
| Rate limiting | Protect HADE endpoint from abuse (no auth = open endpoint) | High |

---

## 6. Summary & Recommendations (Audit-Only)

### Current State Summary

Field Notes is a **mature, production-quality offline-first PWA** with 11 city packs, sophisticated arrival intelligence, live environmental data, and a well-architected offline caching strategy. The system is entirely web-based, client-rendered, and stateless — with no user authentication, no server-side database, and no real-time communication channels.

The **only HADE-facing element** is `SpontaneityEnginePromo.tsx` — a static "Coming Soon" card with no backend contract, no data model, and no API hooks. There is no HADE integration in any meaningful technical sense. The slot exists, the label exists, the intent exists — but the system is a blank canvas from an integration perspective.

The platform's **strength** lies in rich, structured static context (neighborhood profiles, safety scores, arrival tactics, environmental baselines) that HADE could consume as input. Its **weakness** is the absence of user identity, real-time location, and any server-side state — all of which are typically required for accurate AI-driven recommendations.

### Integration Risk Assessment

| Risk | Severity | Notes |
|---|---|---|
| Offline-first vs. live AI conflict | **HIGH** | HADE requires connectivity; offline users get nothing |
| No user auth/identity | **HIGH** | Personalization impossible without identity layer |
| No GPS/within-city location | **HIGH** | Recommendations lack spatial precision |
| No trip date/duration context | **MEDIUM** | Temporal relevance of recommendations is impaired |
| Cold-start API latency | **MEDIUM** | Vercel functions can introduce noticeable delay |
| No event/POI data source | **MEDIUM** | HADE can't recommend specific venues without a data feed |
| Static data staleness | **MEDIUM** | City pack content doesn't auto-refresh; context may be outdated |
| No CORS policy | **LOW–MEDIUM** | Cross-origin HADE calls may require explicit headers |
| No rate limiting | **LOW** | Open endpoints with no auth are vulnerable |
| Single-device state | **LOW** | Acceptable for MVP; becomes a constraint at scale |

### Audit-Focused Considerations for Next Phase

1. **Define the HADE context contract first** — Before any integration code, define the exact JSON payload Field Notes will send to HADE (city slug, coordinates, arrival stage, AQI, neighborhood, transit state, time-of-day). This is the most critical design artifact.

2. **Decide on the offline model** — Three options:
   - (A) HADE recommendations are online-only with a graceful "offline" message
   - (B) Last-fetched HADE recommendations are cached in IDB alongside city data
   - (C) HADE generates offline-capable static recommendation sets at pack-download time

3. **Evaluate auth strategy** — Even anonymous persistent IDs (UUID stored in IDB) would enable basic personalization without requiring a full OAuth implementation.

4. **Assess GPS permission UX** — Browser Geolocation prompts are intrusive; the UX for requesting location within a travel app needs careful design. Consider opt-in within the city guide view ("Share your location for better recommendations").

5. **Review `SpontaneityEnginePromo` placement** — The current bottom-of-page placement is low in the user's attention hierarchy. For real-time recommendations, a sticky contextual card or arrival-stage-triggered panel would be more effective.

6. **Inventory HADE input requirements against Field Notes output** — Systematically map what HADE's recommendation engine needs vs. what Field Notes currently produces. The gap list in Section 3 is the starting point.

7. **Consider a hybrid enrichment approach** — Field Notes provides the static city context (neighborhoods, cost anchors, safety scores, transit); HADE enriches with real-time event data, local secrets, and personalized ranking. Clean separation of responsibilities.

8. **Plan for multi-city trip context** — Currently each city is isolated. HADE may want to know the user's broader itinerary (Paris → Rome → Istanbul) to calibrate recommendations over a trip arc.

---

## Appendix: File Reference Map

| Component / File | Path | HADE Relevance |
|---|---|---|
| Spontaneity Engine Promo | `src/components/SpontaneityEnginePromo.tsx` | **Primary injection point** |
| City Guide View | `src/pages/CityGuideView.tsx` | Container for HADE UI |
| City Pack Type | `src/types/cityPack.ts` | Context schema for HADE payload |
| City Service | `src/services/cityService.ts` | City data fetch layer |
| useCityPack Hook | `src/hooks/useCityPack.ts` | Data + sync state hook |
| Offline Storage | `src/utils/offline-storage.ts` | Cache HADE responses here |
| City Pack IDB | `src/utils/cityPackIdb.ts` | IDB read/write operations |
| Service Worker | `src/sw.ts` | Add HADE response caching |
| Vercel Config | `vercel.json` | Add HADE API rewrite/proxy |
| City Data | `src/data/cities.json` | 11-city content corpus |
| Seasonal Baseline | `public/data/seasonal-baseline.json` | Environmental context fallback |
| Env Variables | `.env` / `.env.example` | Add HADE API keys here |
| API Manifest | `api/manifest.ts` | Reference for new API patterns |
| City Vitals API | `api/city-vitals.ts` | Reference for live data integration |
| Environmental Impact | `src/components/EnvironmentalImpactBlock.tsx` | UX pattern for live data cards |
| Compliance Autopilot | `src/components/ComplianceAutopilot.tsx` | Pattern for autonomous logic UI |

---

*End of Audit Report — Generated by Claude Code — Audit-Only — No implementation changes were made.*
