import { getUAParserResult } from './getUAParserResult';

export function isMacOS(): boolean {
  return getUAParserResult().os.name === 'Mac OS';
}

export default isMacOS;
