export default function stopPropagation(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}
