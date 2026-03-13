/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-deprecated */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

/** Safe for unicode string. */
export function fromBase64(str: string): string {
  const binString = window.atob(str);
  return window.TextDecoder
    ? new TextDecoder().decode(Uint8Array.from(binString, (m) => m.codePointAt(0)!))
    : decodeURIComponent(escape(binString));
}
