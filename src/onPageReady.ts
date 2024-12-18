import { delay } from '@js-toolkit/utils/delay';

export function isPageReady(): boolean {
  return document.readyState === 'complete';
}

interface Options {
  readonly timeout?: number | undefined;
}

/** @returns cancel wait function. */
export function onPageReady(callback: VoidFunction, options?: Options): VoidFunction {
  let delayed: delay.Delay | undefined;

  const cancel = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    window.removeEventListener('load', cbWrapper);
    delayed?.cancel();
  };

  const cbWrapper = (): void => {
    cancel();
    callback();
  };

  if (isPageReady()) {
    callback();
  } else {
    window.addEventListener('load', cbWrapper, { once: true });
    if (options?.timeout) {
      delayed = delay(cbWrapper, options.timeout);
    }
  }

  return cancel;
}
