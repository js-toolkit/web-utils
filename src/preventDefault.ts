/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */

export function preventDefault<
  T extends {
    readonly preventDefault: VoidFunction;
    readonly cancelable?: boolean | undefined;
  },
>(event: T): void {
  if (event.cancelable == null || event.cancelable) {
    event.preventDefault();
  }
}
