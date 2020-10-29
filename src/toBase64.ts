export default function toBase64(str: string): string {
  return window.btoa(unescape(encodeURIComponent(str)));
}
