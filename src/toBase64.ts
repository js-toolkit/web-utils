/** Safe for unicode string. */
export function toBase64(str: string): string {
  const binString = window.TextEncoder
    ? Array.from(new TextEncoder().encode(str), (byte) => String.fromCodePoint(byte)).join('')
    : unescape(encodeURIComponent(str));
  return window.btoa(binString);
}
