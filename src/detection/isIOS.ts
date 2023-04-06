let memo: boolean;

export function isIOS(): boolean {
  if (memo == null) {
    memo = /[(\s](iPhone|iPad|iPod)/i.test(navigator.userAgent);
  }
  return memo;
}

export default isIOS;
