import { getCachedUAInfo } from './ua';

export function isAndroid(): boolean {
  const uaInfo = getCachedUAInfo();
  if (!uaInfo) return false;
  const os = uaInfo.os.name;
  return os === 'Android' || os === 'Android-x86';
}
