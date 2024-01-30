/** Encrypted Media Extensions */
export function isEMESupported(): boolean {
  return (
    !!window.MediaKeys &&
    !!window.navigator &&
    !!window.navigator.requestMediaKeySystemAccess &&
    !!window.MediaKeySystemAccess &&
    !!window.MediaKeySystemAccess.prototype.getConfiguration
  );
}
