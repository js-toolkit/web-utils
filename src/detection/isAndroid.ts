let memo: boolean;

export default function isAndroid(): boolean {
  if (memo == null) {
    memo = /Android/i.test(navigator.userAgent);
  }
  return memo;
}
