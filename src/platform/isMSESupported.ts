import { getMediaSource } from '../media/getMediaSource';

declare global {
  interface Window {
    WebKitSourceBuffer?: typeof SourceBuffer;
  }
}

function getSourceBuffer(): typeof SourceBuffer | undefined {
  return window.SourceBuffer || window.WebKitSourceBuffer;
}

/** Media Source Extensions */
export function isMSESupported(): boolean {
  // Some very old MediaSource implementations didn't have isTypeSupported.
  if (!getMediaSource()?.isTypeSupported) return false;
  // if SourceBuffer is exposed ensure its API is valid.
  // Older browsers do not expose SourceBuffer globally so checking SourceBuffer.prototype is impossible.
  const sourceBuffer = getSourceBuffer();
  return (
    !sourceBuffer ||
    (sourceBuffer.prototype &&
      typeof sourceBuffer.prototype.appendBuffer === 'function' &&
      typeof sourceBuffer.prototype.remove === 'function')
  );
}
