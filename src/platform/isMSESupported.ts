import { getMediaSource } from '../media/getMediaSource';

/** Media Source Extensions */
export function isMSESupported(): boolean {
  // Some very old MediaSource implementations didn't have isTypeSupported.
  return !!getMediaSource()?.isTypeSupported;
}
