export class Semver {
  static parse(version: string): Semver | undefined {
    const parts = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(version);
    if (!parts) return undefined;
    const major = parseInt(parts[1], 10) || 0;
    const minor = parseInt(parts[2], 10) || 0;
    const patch = parseInt(parts[3], 10) || 0;
    return new Semver(major, minor, patch);
  }

  constructor(
    readonly major: number,
    readonly minor: number,
    readonly patch: number
  ) {}

  toString(): string {
    return `${this.major}_${this.minor}_${this.patch}`;
  }
}
