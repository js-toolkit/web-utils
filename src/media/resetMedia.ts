/* eslint-disable no-param-reassign */

/** Remove media from hardware decoder buffer */
export function resetMedia(media: HTMLMediaElement): void {
  if (media.src) {
    media.src = '';
    media.srcObject = null;
    media.load();
  }
}
