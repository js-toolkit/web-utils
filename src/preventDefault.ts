export function preventDefault<
  T extends {
    readonly preventDefault: VoidFunction;
    readonly cancelable?: boolean | undefined;
  }
>(event: T): void {
  if (event.cancelable == null || event.cancelable) {
    event.preventDefault();
  }
}

export default preventDefault;
