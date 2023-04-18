export interface Loop {
  start: (callback: FrameRequestCallback, wait: number) => void;
  stop: VoidFunction;
  call: VoidFunction;
  isActive: () => boolean;
}

export function createLoop(): Loop {
  let timer: number | undefined;
  let raf: number | undefined;
  let active = false;
  let rafCallback: FrameRequestCallback | undefined;

  const call = (): void => {
    if (active && rafCallback) {
      raf && cancelAnimationFrame(raf);
      raf = requestAnimationFrame(rafCallback);
    }
  };

  return {
    start: (callback, wait) => {
      rafCallback = callback;
      if (!active) {
        active = true;
        timer = window.setInterval(call, wait);
      }
    },
    stop: () => {
      if (active) {
        active = false;
        window.clearInterval(timer);
        raf && cancelAnimationFrame(raf);
      }
    },
    call,
    isActive: (): boolean => active,
  };
}

export default createLoop;
