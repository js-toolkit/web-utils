let memo: boolean;

export default function isIOS(): boolean {
  if (memo == null) {
    memo = /[(\s](iPhone|iPad|iPod)/i.test(navigator.userAgent);
  }
  return memo;
}
