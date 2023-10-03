export function isAirPlayAvailable(): boolean {
  return !!window.WebKitPlaybackTargetAvailabilityEvent;
}
