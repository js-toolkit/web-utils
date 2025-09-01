import { getCachedPlatformInfo, getPlatformInfoSync } from './getPlatformInfo';
import { isIOS } from './isIOS';
import { isMacOS } from './isMacOS';

export function isSafari(): boolean {
  const platformInfo = getCachedPlatformInfo() ?? getPlatformInfoSync();
  // if (!platformInfo) return false;
  const browser = platformInfo.browser.name;
  return (
    browser === 'Safari' ||
    browser === 'Mobile Safari' /* ||
    !!window.WebKitPlaybackTargetAvailabilityEvent */ ||
    // WebView
    (browser === 'WebKit' && (isIOS() || isMacOS()))
  );
}
