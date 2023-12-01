import { getCachedUAInfo } from './ua';
import { isIOS } from './isIOS';

// class Semver {
//   constructor(
//     readonly major: number,
//     readonly minor: number,
//     readonly patch: number
//   ) {}

//   toString(): string {
//     return `${this.major}_${this.minor}_${this.patch}`;
//   }
// }

interface Semver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  toString(): string;
}

let memo: Semver | null | undefined;

export function getIOSVersion(): Semver | undefined {
  if (memo === undefined) {
    const uaInfo = getCachedUAInfo();
    if (!uaInfo) return undefined;
    const { os } = uaInfo;
    const version = isIOS() && os.version && /(\d+)\.(\d+)(?:\.(\d+))?/.exec(os.version);
    if (version) {
      // memo = new Semver(
      //   parseInt(version[1], 10) || 0,
      //   parseInt(version[2], 10) || 0,
      //   parseInt(version[3], 10) || 0
      // );
      memo = {
        major: parseInt(version[1], 10) || 0,
        minor: parseInt(version[2], 10) || 0,
        patch: parseInt(version[3], 10) || 0,
        toString() {
          return `${this.major}_${this.minor}_${this.patch}`;
        },
      };
    } else {
      memo = null;
    }
  }

  return memo ?? undefined;
}
