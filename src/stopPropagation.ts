/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */

export function stopPropagation<T extends { stopPropagation: VoidFunction }>(event: T): void {
  event.stopPropagation();
}
