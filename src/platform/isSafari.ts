import { getCachedUAInfo } from './ua';
import { isIOS } from './isIOS';
import { isMacOS } from './isMacOS';

export function isSafari(): boolean {
  const uaInfo = getCachedUAInfo();
  if (!uaInfo) return false;
  const browser = uaInfo.browser.name;
  return (
    browser === 'Safari' ||
    browser === 'Mobile Safari' /* ||
    !!window.WebKitPlaybackTargetAvailabilityEvent */ ||
    // WebView
    (browser === 'WebKit' && (isIOS() || isMacOS()))
  );
}
