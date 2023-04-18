import { getUAParserResult } from './getUAParserResult';

export function isMobile(): boolean {
  const device = getUAParserResult().device.type;
  return device === 'mobile' || device === 'tablet';
}

export default isMobile;
