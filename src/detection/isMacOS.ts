let memo: boolean;

export function isMacOS(): boolean {
  if (memo == null) {
    memo = /Macintosh/i.test(navigator.userAgent);
  }
  return memo;
}

export default isMacOS;
