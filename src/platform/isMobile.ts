import { getUAParserResult } from './getUAParserResult';

export function isMobile(): boolean {
  const parsed = getUAParserResult();
  const deviceType = parsed.device.type;
  if (
    deviceType === 'mobile' ||
    deviceType === 'tablet' ||
    // WKWebView in desktop mode on iPad
    (!deviceType &&
      parsed.device.vendor === 'Apple' &&
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 2)
  ) {
    return true;
  }
  return false;
}
