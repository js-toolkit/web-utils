type WithCancel<T> = T & { cancel: VoidFunction };

export function rafCallback<T extends (...args: unknown[]) => void>(callback: T): WithCancel<T> {
  let handle = 0;

  const fn = ((...args: Parameters<T>): void => {
    handle = requestAnimationFrame(() => callback(...args));
  }) as WithCancel<T>;

  fn.cancel = () => cancelAnimationFrame(handle);

  return fn;
}
