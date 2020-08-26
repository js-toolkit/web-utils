export default function toLocalPoint(
  coord: { clientX: number; clientY: number },
  target: Element
): WebKitPoint {
  const rect = target.getBoundingClientRect();
  return {
    x: coord.clientX - rect.left,
    y: coord.clientY - rect.top,
  };
}
