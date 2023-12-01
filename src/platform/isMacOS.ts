import { getCachedUAInfo } from './ua';
import { isMobile } from './isMobile';

export function isMacOS(): boolean {
  const uaInfo = getCachedUAInfo();
  if (!uaInfo) return false;
  const osName = uaInfo.os.name;
  return (
    (osName === 'Mac OS' ||
      // 2.0+
      osName === 'macOS') &&
    // WebView on iPad
    !isMobile()
  );
}
