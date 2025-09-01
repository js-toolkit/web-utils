import { getCachedPlatformInfo, getPlatformInfoSync } from './getPlatformInfo';

export function isChrome(): boolean {
  const platformInfo = getCachedPlatformInfo() ?? getPlatformInfoSync();
  // if (!platformInfo) return false;
  const browser = platformInfo.browser.name;
  return browser === 'Chrome' || browser === 'Mobile Chrome';
}
