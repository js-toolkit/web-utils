import { getUAParserResult } from './getUAParserResult';
import { isMobile } from './isMobile';

export function isMacOS(): boolean {
  const osName = getUAParserResult().os.name;
  return (
    (osName === 'Mac OS' ||
      // 2.0+
      osName === 'macOS') &&
    // WebView on iPad
    !isMobile()
  );
}
