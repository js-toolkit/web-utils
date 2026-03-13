export function preventDefault(event: {
  readonly preventDefault: VoidFunction;
  readonly cancelable?: boolean | undefined;
}): void {
  if (event.cancelable == null || event.cancelable) {
    event.preventDefault();
  }
}
