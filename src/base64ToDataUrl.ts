export function base64ToDataUrl(base64: string, type = 'image/png'): string {
  return `data:${type};base64,${base64}`;
}
