/** Safe for unicode string. */
export function fromBase64(str: string): string {
  const binString = window.atob(str);
  return window.TextDecoder
    ? new TextDecoder().decode(Uint8Array.from(binString, (m) => m.codePointAt(0)!))
    : decodeURIComponent(escape(binString));
}
