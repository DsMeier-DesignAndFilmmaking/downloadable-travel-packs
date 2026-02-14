/**
 * PWA verification script — run in browser console on a guide page (e.g. /guide/tokyo-japan).
 *
 * Load & run:
 *   fetch('/test-pwa.js').then(r=>r.text()).then(eval); testPWA();
 * Or paste this file into the console, then: testPWA()
 * Or with slug: testPWA('tokyo-japan')
 */

(function () {
  const CACHE_PREFIX = 'travel-guide';
  const CACHE_VERSION = 'v1';
  const IDB_NAME = 'travel-packs-db';
  const IDB_STORE = 'city-packs';

  function getSlugFromPath() {
    const match = window.location.pathname.match(/^\/guide\/([^/]+)\/?$/);
    return match ? match[1] : null;
  }

  function getGuideCacheName(slug) {
    return `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
  }

  async function test1_Manifest(slug) {
    const out = { ok: false, errors: [], manifest: null };
    const link = document.querySelector('link[rel="manifest"]');
    if (!link || !link.href) {
      out.errors.push('No manifest link found');
      return out;
    }
    try {
      const url = link.href.startsWith('blob:') ? link.href : new URL(link.href, window.location.origin).href;
      const res = await fetch(url);
      const manifest = await res.json();
      out.manifest = manifest;
      const expectedStart = `/guide/${slug}`;
      const expectedScope = `/guide/${slug}`;
      if (!manifest.start_url || !manifest.start_url.startsWith(expectedStart)) {
        out.errors.push('manifest.start_url should start with ' + expectedStart + ', got: ' + (manifest.start_url || 'missing'));
      }
      if (!manifest.scope || manifest.scope !== expectedScope) {
        out.errors.push('manifest.scope should be ' + expectedScope + ', got: ' + (manifest.scope || 'missing'));
      }
      out.ok = out.errors.length === 0;
    } catch (e) {
      out.errors.push('Fetch manifest: ' + e.message);
    }
    return out;
  }

  async function test2_ServiceWorkerScope(slug) {
    const out = { ok: false, errors: [], registrations: [] };
    if (!('serviceWorker' in navigator)) {
      out.errors.push('Service Worker not supported');
      return out;
    }
    const regs = await navigator.serviceWorker.getRegistrations();
    out.registrations = regs.map((r) => ({ scope: r.scope, active: !!r.active }));
    const guideScope = `/guide/${slug}`;
    const hasGuideScope = regs.some((r) => r.scope.includes(guideScope) || r.scope === new URL(guideScope + '/', window.location.origin).pathname);
    if (!hasGuideScope && regs.length > 0) {
      out.errors.push('No registration with scope containing /guide/' + slug + '; got: ' + regs.map((r) => r.scope).join(', '));
    }
    if (regs.length === 0) {
      out.errors.push('No service worker registrations found');
    }
    out.ok = out.errors.length === 0;
    return out;
  }

  async function test3_CacheNameIncludesCityId(slug) {
    const out = { ok: false, errors: [], cacheNames: [] };
    if (!('caches' in window)) {
      out.errors.push('Cache API not supported');
      return out;
    }
    const names = await caches.keys();
    out.cacheNames = names;
    const expected = getGuideCacheName(slug);
    const found = names.includes(expected);
    if (!found) {
      out.errors.push('Cache name "' + expected + '" not found. Existing: ' + names.filter((n) => n.startsWith(CACHE_PREFIX)).join(', ') || 'none');
    }
    out.ok = out.errors.length === 0;
    return out;
  }

  async function test4_CacheOnlyGuideAssets(slug) {
    const out = { ok: false, errors: [], urls: [] };
    const cacheName = getGuideCacheName(slug);
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const urls = keys.map((r) => r.url);
      out.urls = urls;
      const guidePath = '/guide/' + slug;
      const apiPath = '/api/manifest/' + slug;
      const bad = urls.filter((u) => {
        const path = new URL(u).pathname;
        if (path === '/' || path === '/index.html') return true;
        if (path.startsWith(guidePath) || path.startsWith(apiPath)) return false;
        return true;
      });
      if (bad.length) {
        out.errors.push('Cache contains non-guide URLs: ' + bad.join(', '));
      }
      if (urls.length === 0) {
        out.errors.push('Cache is empty (guide may not be cached yet)');
      }
      out.ok = out.errors.length === 0;
    } catch (e) {
      out.errors.push('Open cache: ' + e.message);
    }
    return out;
  }

  async function test5_HomeNotInGuideCache(slug) {
    const out = { ok: false, errors: [], hasHome: false };
    const cacheName = getGuideCacheName(slug);
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const homeRequests = keys.filter((r) => {
        const path = new URL(r.url).pathname;
        return path === '/' || path === '/index.html';
      });
      out.hasHome = homeRequests.length > 0;
      if (out.hasHome) {
        out.errors.push('Home page (/) is in guide cache — should not be. Cached: ' + homeRequests.map((r) => r.url).join(', '));
      }
      out.ok = !out.hasHome;
    } catch (e) {
      out.errors.push('Open cache: ' + e.message);
    }
    return out;
  }

  async function test6_IndexedDBHasGuideData(slug) {
    const out = { ok: false, errors: [], hasData: false, keys: [] };
    if (!('indexedDB' in window)) {
      out.errors.push('IndexedDB not supported');
      return out;
    }
    return new Promise((resolve) => {
      const req = indexedDB.open(IDB_NAME);
      req.onerror = () => {
        out.errors.push('Open IDB: ' + req.error);
        resolve(out);
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          out.errors.push('Store "' + IDB_STORE + '" not found');
          db.close();
          resolve(out);
          return;
        }
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get(slug);
        getReq.onerror = () => {
          out.errors.push('Get guide: ' + getReq.error);
          db.close();
          resolve(out);
        };
        getReq.onsuccess = () => {
          const row = getReq.result;
          out.hasData = !!row && !!row.pack;
          if (!out.hasData) {
            out.errors.push('No IndexedDB entry for slug "' + slug + '" (or pack missing). Save the guide once to populate.');
          }
          out.ok = out.hasData;
          const allReq = store.getAllKeys();
          allReq.onsuccess = () => {
            out.keys = allReq.result || [];
            db.close();
            resolve(out);
          };
        };
      };
    });
  }

  async function runAll(slug) {
    const s = slug || getSlugFromPath();
    if (!s) {
      console.warn('Not on a guide page. Run from /guide/<slug> or call testPWA("tokyo-japan")');
      return null;
    }
    console.log('%c PWA Test — guide: ' + s + ' ', 'background:#222;color:#FFDD00;font-weight:bold;padding:4px 8px;');
    const results = {
      slug: s,
      '1_manifest_start_url_scope': await test1_Manifest(s),
      '2_sw_registered_scope': await test2_ServiceWorkerScope(s),
      '3_cache_name_has_city_id': await test3_CacheNameIncludesCityId(s),
      '4_cache_only_guide_assets': await test4_CacheOnlyGuideAssets(s),
      '5_home_not_in_guide_cache': await test5_HomeNotInGuideCache(s),
      '6_indexeddb_has_guide': await test6_IndexedDBHasGuideData(s),
    };
    const passed = Object.values(results).filter((r) => r && typeof r.ok === 'boolean' && r.ok).length;
    const total = Object.keys(results).filter((k) => k !== 'slug').length;
    console.log('Results:', results);
    console.log('%c ' + passed + ' / ' + total + ' checks passed ', passed === total ? 'color:green;font-weight:bold' : 'color:orange;font-weight:bold');
    return results;
  }

  window.testPWA = runAll;
  console.log('PWA test loaded. Run testPWA() on a guide page, or testPWA("city-slug").');
})();
