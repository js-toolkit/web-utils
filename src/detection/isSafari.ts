export function isSafari(): boolean {
  return !!window.WebKitPlaybackTargetAvailabilityEvent;
}

export default isSafari;
