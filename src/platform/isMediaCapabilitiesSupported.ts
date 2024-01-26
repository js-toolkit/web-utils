export function isMediaCapabilitiesSupported(): boolean {
  return (
    !!window.MediaCapabilities &&
    !!window.navigator &&
    !!window.navigator.mediaCapabilities?.decodingInfo
  );
}
