import { getUAParserResult } from './getUAParserResult';

export function isIOS(): boolean {
  return getUAParserResult().os.name === 'iOS';
}

export default isIOS;
