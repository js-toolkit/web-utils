import isIOS from './isIOS';

class Semver {
  constructor(readonly major: number, readonly minor: number, readonly patch: number) {}

  toString(): string {
    return `${this.major}_${this.minor}_${this.patch}`;
  }
}

let memo: Semver | null | undefined;

export function getIOSVersion(): Semver | undefined {
  if (memo === undefined) {
    const version = isIOS() && /OS (\d+)_(\d+)_?(\d+)?/.exec(navigator.userAgent);
    if (version) {
      memo = new Semver(
        parseInt(version[1], 10) || 0,
        parseInt(version[2], 10) || 0,
        parseInt(version[3], 10) || 0
      );
    } else {
      memo = null;
    }
  }

  return memo ?? undefined;
}

export default getIOSVersion;
