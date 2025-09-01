import { getCachedPlatformInfo, getPlatformInfoSync } from './getPlatformInfo';
import { isMobile } from './isMobile';

export function isMacOS(): boolean {
  const platformInfo = getCachedPlatformInfo() ?? getPlatformInfoSync();
  // if (!platformInfo) return false;
  const osName = platformInfo.os.name;
  return (
    (osName === 'Mac OS' ||
      // 2.0+
      osName === 'macOS') &&
    // WebView on iPad
    !isMobile()
  );
}
