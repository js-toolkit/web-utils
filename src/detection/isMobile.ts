let memo: boolean;

export function isMobile(): boolean {
  if (memo == null) {
    memo = /Mobile/i.test(navigator.userAgent);
  }
  return memo;
}

export default isMobile;
