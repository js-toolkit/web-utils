import { getCachedUAInfo } from './ua';

export function isMobile(): boolean {
  const uaInfo = getCachedUAInfo();
  if (!uaInfo) return false;
  const deviceType = uaInfo.device.type;
  if (
    deviceType === 'mobile' ||
    deviceType === 'tablet' ||
    // WKWebView in desktop mode on iPad
    (!deviceType &&
      uaInfo.device.vendor === 'Apple' &&
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 2)
  ) {
    return true;
  }
  return false;
}
