/** Remove media from hardware decoder buffer. */
export function resetMedia(media: HTMLMediaElement): void {
  if (media.src || media.srcObject || media.childElementCount > 0) {
    URL.revokeObjectURL(media.src);
    media.removeAttribute('src');
    media.srcObject = null;
    if (media.childElementCount > 0) {
      (Array.prototype as HTMLSourceElement[]).filter
        .call(media.children, (element) => element instanceof HTMLSourceElement)
        .forEach((el) => {
          URL.revokeObjectURL(el.src);
          media.removeChild(el);
        });
    }
    media.load();
  }
}
