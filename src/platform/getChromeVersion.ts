import { getCachedPlatformInfo, getPlatformInfoSync } from './getPlatformInfo';
import { isChrome } from './isChrome';
import { Semver } from './Semver';

let memo: Semver | null | undefined;

export function getChromeVersion(): Semver | undefined {
  if (memo === undefined) {
    const platformInfo = getCachedPlatformInfo() ?? getPlatformInfoSync();
    if (isChrome() && platformInfo.browser.version) {
      memo = Semver.parse(platformInfo.browser.version);
    } else {
      memo = null;
    }
  }

  return memo ?? undefined;
}
