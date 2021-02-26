/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

function getMediaSource(): typeof MediaSource | undefined {
  return window.MediaSource || window.WebKitMediaSource;
}

/** Media Source Extensions */
export default function isMSESupported(): boolean {
  return !!getMediaSource();
}
