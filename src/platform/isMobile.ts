import { getCachedPlatformInfo, getPlatformInfoSync } from './getPlatformInfo';

export function isMobile(): boolean {
  const platformInfo = getCachedPlatformInfo() ?? getPlatformInfoSync();
  // if (!platformInfo) return false;
  const deviceType = platformInfo.device.type;
  if (
    deviceType === 'mobile' ||
    deviceType === 'tablet' ||
    // WKWebView in desktop mode on iPad
    (!deviceType &&
      platformInfo.device.vendor === 'Apple' &&
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 2)
  ) {
    return true;
  }
  return false;
}
