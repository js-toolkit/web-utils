/** Remove media from hardware decoder buffer. */
export function resetMedia(media: HTMLMediaElement): void {
  if (media.src || media.srcObject || media.childElementCount > 0) {
    URL.revokeObjectURL(media.src);
    media.removeAttribute('src');
    media.srcObject = null;
    if (media.childElementCount > 0) {
      for (const element of media.children) {
        if (element instanceof HTMLSourceElement) {
          media.removeChild(element);
        }
      }
    }
    media.load();
  }
}
