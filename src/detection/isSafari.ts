import { getUAParserResult } from './getUAParserResult';

export function isSafari(): boolean {
  const browser = getUAParserResult().browser.name;
  return (
    browser === 'Safari' ||
    browser === 'Mobile Safari' ||
    !!window.WebKitPlaybackTargetAvailabilityEvent
  );
}

export default isSafari;
