export default function preventDefault(event: {
  preventDefault: VoidFunction;
  cancelable?: boolean | undefined;
}): void {
  if (event.cancelable == null || event.cancelable) {
    event.preventDefault();
  }
}
