export function toLocalPoint(
  coord: { clientX: number; clientY: number },
  targetOrClientRect: Element | Pick<DOMRect, 'left' | 'top'>
): Point {
  const rect =
    'tagName' in targetOrClientRect
      ? targetOrClientRect.getBoundingClientRect()
      : targetOrClientRect;
  return {
    x: coord.clientX - rect.left,
    y: coord.clientY - rect.top,
  };
}
