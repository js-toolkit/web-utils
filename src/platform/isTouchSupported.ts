export function isTouchSupported(): boolean {
  // https://habr.com/ru/companies/ruvds/articles/556156/
  return window.matchMedia('(any-pointer: coarse) and (any-hover: none)').matches;
}
