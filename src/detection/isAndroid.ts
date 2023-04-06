let memo: boolean;

export function isAndroid(): boolean {
  if (memo == null) {
    memo = /Android/i.test(navigator.userAgent);
  }
  return memo;
}

export default isAndroid;
