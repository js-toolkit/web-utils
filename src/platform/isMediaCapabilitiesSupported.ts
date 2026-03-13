/* eslint-disable @typescript-eslint/strict-boolean-expressions */

export function isMediaCapabilitiesSupported(): boolean {
  return (
    !!window.MediaCapabilities &&
    !!window.navigator &&
    !!window.navigator.mediaCapabilities?.decodingInfo
  );
}
