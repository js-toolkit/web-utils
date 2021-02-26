export default function isSafari(): boolean {
  return !!window.WebKitPlaybackTargetAvailabilityEvent;
}
