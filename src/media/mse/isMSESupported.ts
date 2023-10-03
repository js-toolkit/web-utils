import { getMediaSource } from './getMediaSource';

export function isMSESupported(): boolean {
  // Some very old MediaSource implementations didn't have isTypeSupported.
  return !!getMediaSource()?.isTypeSupported;
}
