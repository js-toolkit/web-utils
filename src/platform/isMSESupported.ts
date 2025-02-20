import { getMediaSource } from '../media/getMediaSource';
import { getSourceBuffer } from '../media/getSourceBuffer';

type ManagedMediaSourceOption = Parameters<typeof getMediaSource>[0];

/** Media Source Extensions */
export function isMSESupported(managedMediaSource?: ManagedMediaSourceOption): boolean {
  // Some very old MediaSource implementations didn't have isTypeSupported.
  if (!getMediaSource(managedMediaSource)?.isTypeSupported) return false;
  // if SourceBuffer is exposed ensure its API is valid.
  // Older browsers do not expose SourceBuffer globally so checking SourceBuffer.prototype is impossible.
  const sourceBuffer = getSourceBuffer(managedMediaSource);
  return (
    !sourceBuffer ||
    (sourceBuffer.prototype &&
      typeof sourceBuffer.prototype.appendBuffer === 'function' &&
      typeof sourceBuffer.prototype.remove === 'function')
  );
}
