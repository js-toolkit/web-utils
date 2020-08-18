export default function preventDefault(event: { preventDefault: () => void }): void {
  event.preventDefault();
}
