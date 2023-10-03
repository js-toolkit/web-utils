import { getUAParserResult } from './getUAParserResult';
import { isMobile } from './isMobile';

export function isIOS(): boolean {
  const parsed = getUAParserResult();
  return (
    parsed.os.name === 'iOS' ||
    // WebView on iPad
    (isMobile() && parsed.device.vendor === 'Apple')
  );
}
