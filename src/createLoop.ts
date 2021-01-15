export interface Loop {
  start: (callback: FrameRequestCallback, wait: number) => void;
  stop: VoidFunction;
  call: VoidFunction;
  isActive: () => boolean;
}

export default function createLoop(): Loop {
  let timer: number | undefined;
  let raf: number | undefined;
  let activity = false;
  let rafCallback: FrameRequestCallback | undefined;

  const step = (): void => {
    if (activity && rafCallback) {
      raf && cancelAnimationFrame(raf);
      raf = requestAnimationFrame(rafCallback);
    }
  };

  const result: Loop = {
    start: (callback, wait) => {
      rafCallback = callback;
      if (!activity) {
        activity = true;
        timer = window.setInterval(step, wait);
      }
    },
    stop: () => {
      if (activity) {
        activity = false;
        window.clearInterval(timer);
        raf && cancelAnimationFrame(raf);
      }
    },
    call: () => step(),
    isActive: (): boolean => activity,
  };

  return result;
}
