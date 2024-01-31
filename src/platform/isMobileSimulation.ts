function isTouchDevice(): boolean {
  // https://habr.com/ru/companies/ruvds/articles/556156/
  return window.matchMedia('(any-pointer: coarse) and (any-hover: none)').matches;
}

/** Detect mobile simulation in Chrome DevTools. */
export function isMobileSimulation(): boolean {
  return (
    isTouchDevice() &&
    // maxTouchPoints is always = 1 in simulation mode
    navigator.maxTouchPoints === 1
  );
}
