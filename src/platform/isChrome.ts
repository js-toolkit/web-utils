import { getCachedPlatformInfo } from './getPlatformInfo';

export function isChrome(): boolean {
  const platformInfo = getCachedPlatformInfo();
  if (!platformInfo) return false;
  const browser = platformInfo.browser.name;
  return browser === 'Chrome' || browser === 'Mobile Chrome';
}
