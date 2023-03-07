export default function stopPropagation<T extends { stopPropagation: VoidFunction }>(
  event: T
): void {
  event.stopPropagation();
}
