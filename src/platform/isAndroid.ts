import { getCachedPlatformInfo, getPlatformInfoSync } from './getPlatformInfo';

export function isAndroid(): boolean {
  const platformInfo = getCachedPlatformInfo() ?? getPlatformInfoSync();
  // if (!platformInfo) return false;
  const os = platformInfo.os.name;
  return os === 'Android' || os === 'Android-x86';
}
