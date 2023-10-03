import { getUAParserResult } from './getUAParserResult';

export function isAndroid(): boolean {
  const os = getUAParserResult().os.name;
  return os === 'Android' || os === 'Android-x86';
}
