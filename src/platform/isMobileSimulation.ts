import { isTouchSupported } from './isTouchSupported';

/** Detect mobile simulation in Chrome DevTools. */
export function isMobileSimulation(): boolean {
  return (
    isTouchSupported() &&
    // maxTouchPoints is always = 1 in simulation mode
    navigator.maxTouchPoints === 1
  );
}
