# Audit: Data Flow & PWA Integration

## 1. `api/manifest.ts` — Dynamic Web Manifest Generation

**How it works:**
- **Trigger:** Vercel rewrite sends `/api/manifest/:slug` → `/api/manifest?slug=:slug`. The handler reads `req.query.slug`.
- **Logic:**
  - `slug` is required; missing → `400` with `{ error: 'Missing slug' }`.
  - City display name is derived with `slugToTitle(slug)` (e.g. `london-uk` → `London Uk`).
  - Origin for icon URLs is taken from `x-forwarded-proto` + `x-forwarded-host`, fallback `https://travelpacks.example.com`.
- **Output:** A **PWA manifest** (not city pack data):
  - `name` / `short_name`: `"{CityName} Pack"`
  - `start_url`: `/guide/{slug}?utm_source=pwa`
  - `display`: `standalone`, `scope`: `/`
  - `theme_color` / `background_color`: `#0f172a`
  - `icons`: single entry, `src`: `{origin}/vite.svg`, `sizes`: `any`, `type`: `image/svg+xml`, `purpose`: `any`
- **Headers:** `Content-Type: application/manifest+json`, `Cache-Control: s-maxage=0`

**Important:** This API returns **only** the web app manifest (name, start_url, icons). It does **not** return `CityPack` (emergency, survival_kit, etc.). City pack data lives in `src/data/cities.json` and is loaded by the client via `cityService.fetchCityPack()`.

---

## 2. `api/suggest-city.ts` — City Request Schema

**Current schema (implicit):**
- **Method:** `POST` only; others → `405`.
- **Body (JSON):**
  - `cityName?: string` — e.g. "Berlin", "Sydney"
  - `notes?: string` — optional context (country, region, needs)
- **Behavior:** Mock only. Parses body with `JSON.parse(req.body)`, no validation. Always returns:
  - `200`
  - `{ ok: true, message: 'Suggestion received (mock). AI pack generation coming soon.', cityName: body.cityName ?? null }`

**No persistence or AI.** Ready to be wired to a queue or AI pipeline later.

---

## 3. `usePWAInstall.ts` & `vite.config.ts` — Connection to Manifest API

**usePWAInstall.ts:**
- Listens for `beforeinstallprompt`, stores the event in state, and exposes `installPWA()` to trigger the native install dialog.
- Does **not** call the manifest API or any URL. The browser uses the **manifest link** in the document to decide install name, icon, and start_url.
- Detects installed state via `display-mode: standalone` and clears the prompt on `appinstalled`.

**vite.config.ts (VitePWA):**
- **strategies:** `generateSW` — Workbox generates the service worker.
- **registerType:** `prompt` — updates require user confirmation (e.g. refresh prompt).
- **injectRegister:** `null` — no automatic registration; the app registers the SW manually (e.g. when entering a city guide).
- **Manifest:** Base shell only (`name`, `short_name`, `description`, `theme_color`, `background_color`, `display`, `start_url: '/'`). The **city-specific** manifest is **not** in the build; it’s injected at runtime in `CityGuideView`.

**Connection to manifest API:**
1. **CityGuideView** sets `<link rel="manifest" href={MANIFEST_URL(slug)}>` (from `apiConfig`: DEV → `/mock/manifest/{slug}.json`, PROD → `/api/manifest/{slug}`).
2. When the user taps “Add to Home Screen”, the browser fetches that manifest URL (mock or Vercel) and uses it for the installed app name, icon, and start_url.
3. **usePWAInstall** only triggers the install UI; it does not fetch the manifest. So the **manifest API (or mock)** is used indirectly: the browser loads whatever URL is in the `<link rel="manifest">` when install runs.

**Workbox caching:**
- **navigateFallback:** `/index.html` (SPA).
- **navigateFallbackDenylist:** `/api/`, `/manifests/`, `manifest.json`, `.webmanifest` — so manifest and API responses are **not** served from the SW cache.
- **runtimeCaching:**
  - **NetworkFirst** for URLs whose `pathname.startsWith('/guide/')` → cache name `tp-v2-guide-data` (timeout 5s, max 20 entries). This caches **page navigations** to `/guide/:slug` (the document/HTML), not a separate “city pack JSON” API.
  - **CacheFirst** for static assets (js, css, fonts, images).

So: **manifest API** = only for PWA install (name, icon, start_url). **City pack data** = from `cities.json` (bundled) or from a future API; currently **not** returned by `api/manifest.ts`.

---

## 4. `src/types/cityPack.ts` & `src/data/cities.json`

**cityPack.ts:**
- **CityPackEmergency:** flexible keys (police, medical, tourist_police, ambulance, emergency_all, non_emergency, general_eu, health_note, etc.).
- **CityPackSurvivalKit:** `tap_water`, `power_plug`, `tipping`, `toilets`.
- **CityPackTransitLogic:** `primary_app`, `payment_method`, `etiquette`.
- **CityPack:** `slug`, `name`, `country`, `last_updated`, `emergency`, `survival_kit`, `transit_logic`, `scam_alerts[]`, `real_time_hacks[]`.
- **CitiesJson:** `{ cities: CityPack[] }`.

**cities.json:**
- Single root key `cities`; array of objects matching `CityPack`.
- Each city has the survival-first fields above (emergency numbers, survival_kit, transit_logic, scam_alerts, real_time_hacks). No “Arrival” or “Superior” category yet.

**Data flow:**
- **cityService** imports `cities.json` and exposes `cityPacksList` (slug, name, country) and `fetchCityPack(slug)`.
- **fetchCityPack:** in DEV calls `getCityPackUrl(slug)` → `/mock/manifest/{slug}.json` (manifest JSON), fails `isCityPack()` and falls back to local `cities.json`; in PROD calls `/api/manifest/{slug}` (same manifest response), same fallback. So **city pack data always comes from the bundled `cities.json`** until a dedicated city-pack API exists.
- **useCityPack(slug)** calls `fetchCityPack`, returns `{ cityData, isLoading, isOffline, error, refetch }`.
- **CityGuideView** uses `useCityPack` and renders Emergency, Survival (tap water, power), Security (scam_alerts), Transit Logic from `cityData`.

---

## 5. Injecting “Superior” Travel Pack Fields (Emergency, Survival, Arrival) into PWA Caching

**Current state:**
- **Emergency** and **Survival** are already part of `CityPack` and are rendered in CityGuideView. They are **not** stored in a dedicated cache; they’re part of the in-memory `cityData` loaded from the bundled JSON (or a future API).
- **Arrival** (e.g. airport, first 24h) is **not** in the type or JSON yet.
- Workbox caches **navigation** to `/guide/:slug` (HTML/JS) with NetworkFirst. It does **not** cache a separate “city pack JSON” URL because no such URL is used yet (city data is from the bundle or would need a new endpoint).

**To inject Superior fields (Emergency, Survival, Arrival) into PWA caching:**

1. **Extend data model**
   - In `cityPack.ts`, add an optional **`arrival`** (e.g. `arrival?: { airport_tips?: string; first_24h?: string }` or similar).
   - In `cities.json`, add `arrival` (and any extra Emergency/Survival fields) per city. Optionally introduce a **`category`** or **`pack_tier`** (e.g. `"Superior"`) if you want to flag which cities have the full set.

2. **Ensure city pack JSON is cacheable**
   - **Option A (recommended):** Add an API that returns **CityPack** (e.g. `GET /api/cities/:slug` or `GET /api/pack/:slug`) and have the client call that in DEV/PROD. Then in **vite.config.ts** add a **runtimeCaching** rule for that URL (e.g. NetworkFirst with cache name `tp-v2-city-packs`). That way Emergency, Survival, Arrival are cached as part of the pack response.
   - **Option B:** When the user opens a city guide, the client writes the current `cityData` (including Superior fields) to **CacheStorage** under a dedicated cache (e.g. `city-packs`) with a key like `/guide/{slug}/pack.json`. Then a custom fetch in `useCityPack` could try CacheStorage first, then network, then local bundle. Workbox does not do this automatically; you’d implement it in the service/hook.

3. **Keep manifest for install only**
   - `api/manifest.ts` should stay focused on **PWA manifest** (name, short_name, start_url, display, icons). It does **not** need to include Emergency/Survival/Arrival; those belong in the **CityPack** payload and in the caching layer above.

---

## 6. Category-Specific Icons (e.g. “Safety”) in the Manifest

**Current:** `api/manifest.ts` and all mock manifests use a **single** icon: `{ origin }/vite.svg` with `purpose: "any"`.

**Do we need to update manifest for category-specific icons (e.g. Safety)?**
- **Manifest icons** are used by the OS for the **home screen icon** and possibly splash. They are **not** used to show “Safety” vs “Transit” inside the app; those are in-app UI (e.g. lucide-react).
- If the goal is **different home screen icons per category** (e.g. one icon for “Safety” packs, another for “Full” packs):
  - You could extend **manifest.ts** to accept a **category** or **tier** (e.g. query or from a shared config) and return different `icons[]` entries (e.g. `safety-icon.svg`, `full-pack-icon.svg`). Same for mock manifests: different icon filenames per category.
  - You’d need to add those icon assets (e.g. in `public/`) and reference them in the manifest.
- If the goal is **in-app** category icons (Safety, Survival, Arrival), that’s entirely in the **UI** (CityGuideView + lucide-react); no change to `manifest.ts` required.

**Recommendation:** Only change **manifest.ts** (and mock manifests) to add category-specific **icons** if you want different **home screen / install** icons per pack type. For in-app category icons, use existing components and assets; no manifest change needed.

---

## Summary Table

| Piece | Role | Uses manifest API? | Uses CityPack? |
|-------|------|--------------------|----------------|
| **api/manifest.ts** | Serves PWA manifest (name, start_url, icons) | N/A (is the API) | No |
| **api/suggest-city.ts** | Receives city suggestions (cityName, notes) | No | No |
| **usePWAInstall** | Triggers install prompt; detects standalone | No (browser uses `<link rel="manifest">`) | No |
| **vite.config.ts** | Builds SW; base manifest; caches /guide/ navigations | No | No |
| **CityGuideView** | Injects `<link href={MANIFEST_URL(slug)}>`; renders pack | Yes (indirect: sets manifest URL) | Yes (via useCityPack) |
| **cityService** | Fetches pack; fallback to cities.json | getCityPackUrl points at manifest URL (response not CityPack) | Yes (localData) |
| **cityPack.ts / cities.json** | Type and data for packs | No | Yes |

**Conclusion:** To support “Superior” fields (Emergency, Survival, Arrival) in PWA caching: (1) add `arrival` (and any extra fields) to `CityPack` and `cities.json`, (2) introduce a dedicated city-pack API and/or client-side CacheStorage write for pack JSON, and (3) wire Workbox or client logic to cache that pack response. Update **manifest.ts** for category-specific **icons** only if you want different install/home screen icons per pack category; in-app category icons stay in the UI layer.
