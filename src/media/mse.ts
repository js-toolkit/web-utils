declare global {
  interface Window {
    WebKitMediaSource?: typeof MediaSource;
  }
}

export function getMediaSource(): typeof MediaSource | undefined {
  return window.MediaSource || window.WebKitMediaSource;
}

/** Media Source Extensions */
export function isMSESupported(): boolean {
  return !!getMediaSource();
}
