declare global {
  interface Window {
    WebKitMediaSource?: typeof MediaSource;
  }
}

export function getMediaSource(): typeof MediaSource | undefined {
  return window.MediaSource || window.WebKitMediaSource;
}
