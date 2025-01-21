export interface RafLoopStartOptions {
  readonly suspendTimeout?: number | undefined;
  readonly scope?: AnimationFrameProvider | undefined;
}

export interface RafLoop {
  start: (callback: FrameRequestCallback, options?: RafLoopStartOptions) => void;
  stop: (waitLast?: boolean) => void;
  isActive: () => boolean;
}

export function createRafLoop(): RafLoop {
  let active = false;
  let timer: number | undefined;
  let raf: number | undefined;
  let suspendTimeout = 0;
  let scope: AnimationFrameProvider = window;
  let rafCallback: FrameRequestCallback | undefined;

  const reset = (): void => {
    window.clearTimeout(timer);
    raf && scope.cancelAnimationFrame(raf);
    raf = undefined;
    suspendTimeout = 0;
    timer = undefined;
  };

  const call = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    raf = scope.requestAnimationFrame(step);
  };

  const step = (time: number): void => {
    if (!rafCallback) return;
    if (active) {
      rafCallback(time);
      if (suspendTimeout > 0) {
        timer = window.setTimeout(call, suspendTimeout);
      } else {
        call();
      }
    }
    // Wait last call
    else if (raf != null || timer != null) {
      reset();
      rafCallback(time);
    }
  };

  return {
    start: (callback, { suspendTimeout: _suspendTimeout = 0, scope: _scope = window } = {}) => {
      rafCallback = callback;
      suspendTimeout = _suspendTimeout;
      scope = _scope;
      if (!active) {
        active = true;
        call();
      }
    },
    stop: (waitLast) => {
      if (active) {
        active = false;
        if (!waitLast) reset();
      }
    },
    isActive: (): boolean => active,
  };
}
