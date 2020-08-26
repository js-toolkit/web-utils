export default function preventDefault(event: {
  preventDefault: () => void;
  cancelable?: boolean;
}): void {
  if (event.cancelable == null || event.cancelable) {
    event.preventDefault();
  }
}
