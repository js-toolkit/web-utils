/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export default function isAirPlayAvailable(): boolean {
  return !!window.WebKitPlaybackTargetAvailabilityEvent;
}
