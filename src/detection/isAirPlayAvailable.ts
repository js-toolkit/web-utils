export function isAirPlayAvailable(): boolean {
  return !!window.WebKitPlaybackTargetAvailabilityEvent;
}

export default isAirPlayAvailable;
