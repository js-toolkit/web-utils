import { getCachedPlatformInfo } from './getPlatformInfo';

export function isAndroid(): boolean {
  const platformInfo = getCachedPlatformInfo();
  if (!platformInfo) return false;
  const os = platformInfo.os.name;
  return os === 'Android' || os === 'Android-x86';
}
