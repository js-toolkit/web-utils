export interface RafLoopStartOptions {
  readonly suspendTimeout?: number;
  readonly scope?: AnimationFrameProvider;
}

export interface RafLoop {
  start: (callback: FrameRequestCallback, options?: RafLoopStartOptions) => void;
  stop: () => void;
  isActive: () => boolean;
}

export function createRafLoop(): RafLoop {
  let active = false;
  let timer: number | undefined;
  let raf: number | undefined;
  let suspendTimeout = 0;
  let scope: AnimationFrameProvider = window;
  let rafCallback: FrameRequestCallback | undefined;

  const call = (): void => {
    // eslint-disable-next-line no-use-before-define
    raf = scope.requestAnimationFrame(step);
  };

  const step = (time: number): void => {
    if (active && rafCallback) {
      rafCallback(time);
      if (suspendTimeout > 0) {
        timer = window.setTimeout(call, suspendTimeout);
      } else {
        call();
      }
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
    stop: () => {
      if (active) {
        active = false;
        window.clearTimeout(timer);
        raf && cancelAnimationFrame(raf);
        raf = undefined;
        suspendTimeout = 0;
        timer = undefined;
      }
    },
    isActive: (): boolean => active,
  };
}
