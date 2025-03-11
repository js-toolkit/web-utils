import { getCachedPlatformInfo } from './getPlatformInfo';
import { isIOS } from './isIOS';
import { Semver } from './Semver';

let memo: Semver | null | undefined;

export function getIOSVersion(): Semver | undefined {
  if (memo === undefined) {
    const platformInfo = getCachedPlatformInfo();
    if (!platformInfo) return undefined;
    const { os } = platformInfo;
    if (isIOS() && os.version) {
      memo = Semver.parse(os.version);
    } else {
      memo = null;
    }
  }

  return memo ?? undefined;
}
