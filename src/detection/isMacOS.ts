let memo: boolean;

export default function isMacOS(): boolean {
  if (memo == null) {
    memo = /Macintosh/i.test(navigator.userAgent);
  }
  return memo;
}
