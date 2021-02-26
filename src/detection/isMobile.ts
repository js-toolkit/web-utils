let memo: boolean;

export default function isMobile(): boolean {
  if (memo == null) {
    memo = /Mobile/i.test(navigator.userAgent);
  }
  return memo;
}
