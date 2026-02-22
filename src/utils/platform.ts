export type PlatformOS = 'android' | 'ios' | 'other';
export type PlatformBrowser = 'chrome' | 'safari' | 'firefox' | 'edge' | 'other';

export interface PlatformInfo {
  os: PlatformOS;
  browser: PlatformBrowser;
  isChromeiOS: boolean;
}

export function getPlatform(): PlatformInfo {
  if (typeof navigator === 'undefined') {
    return { os: 'other', browser: 'other', isChromeiOS: false };
  }

  const ua = navigator.userAgent || '';
  const uaLower = ua.toLowerCase();

  const isIPhoneIPadIPod = /iphone|ipad|ipod/.test(uaLower);
  const isIPadOSDesktopUA =
    typeof navigator !== 'undefined' &&
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1;
  const isIOS = isIPhoneIPadIPod || isIPadOSDesktopUA;
  const isAndroid = /android/.test(uaLower);

  let browser: PlatformBrowser = 'other';
  if (/edg\//.test(uaLower)) {
    browser = 'edge';
  } else if (/fxios|firefox\//.test(uaLower)) {
    browser = 'firefox';
  } else if (/crios|chrome\//.test(uaLower)) {
    browser = 'chrome';
  } else if (/safari\//.test(uaLower) && !/crios|chrome|android/.test(uaLower)) {
    browser = 'safari';
  }

  const os: PlatformOS = isAndroid ? 'android' : isIOS ? 'ios' : 'other';
  const isChromeiOS = os === 'ios' && browser === 'chrome';

  return { os, browser, isChromeiOS };
}
