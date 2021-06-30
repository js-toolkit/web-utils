export default function isAirPlayAvailable(): boolean {
  return !!window.WebKitPlaybackTargetAvailabilityEvent;
}
