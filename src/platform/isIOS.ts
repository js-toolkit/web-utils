import { getCachedUAInfo } from './ua';
import { isMobile } from './isMobile';

export function isIOS(): boolean {
  const uaInfo = getCachedUAInfo();
  if (!uaInfo) return false;
  return (
    uaInfo.os.name === 'iOS' ||
    // WebView on iPad
    (isMobile() && uaInfo.device.vendor === 'Apple')
  );
}
