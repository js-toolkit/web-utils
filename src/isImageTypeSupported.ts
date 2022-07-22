export function isImageTypeSupported(mimeType: string): boolean {
  try {
    return document.createElement('canvas').toDataURL(mimeType).startsWith(`data:${mimeType}`);
  } catch {
    return false;
  }
}
