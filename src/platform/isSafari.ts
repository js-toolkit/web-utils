import { getUAParserResult } from './getUAParserResult';
import { isIOS } from './isIOS';
import { isMacOS } from './isMacOS';

export function isSafari(): boolean {
  const browser = getUAParserResult().browser.name;
  return (
    browser === 'Safari' ||
    browser === 'Mobile Safari' /* ||
    !!window.WebKitPlaybackTargetAvailabilityEvent */ ||
    // WebView
    (browser === 'WebKit' && (isIOS() || isMacOS()))
  );
}
