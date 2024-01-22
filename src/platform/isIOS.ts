import { getCachedPlatformInfo } from './getPlatformInfo';
import { isMobile } from './isMobile';

export function isIOS(): boolean {
  const platformInfo = getCachedPlatformInfo();
  if (!platformInfo) return false;
  return (
    platformInfo.os.name === 'iOS' ||
    // WebView on iPad
    (isMobile() && platformInfo.device.vendor === 'Apple')
  );
}
