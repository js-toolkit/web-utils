export interface RafLoop {
  start: (callback: FrameRequestCallback) => void;
  stop: () => void;
  isActive: () => boolean;
}

export default function createRafLoop(): RafLoop {
  let raf: number | undefined;
  let rafActivity = false;
  let rafCallback: FrameRequestCallback | undefined;

  const step = (time: number): void => {
    if (rafActivity && rafCallback) {
      rafCallback(time);
      raf = requestAnimationFrame(step);
    }
  };

  const result: RafLoop = {
    start: (callback: FrameRequestCallback) => {
      rafCallback = callback;
      if (!rafActivity) {
        rafActivity = true;
        raf = requestAnimationFrame(step);
      }
    },
    stop: () => {
      if (rafActivity) {
        rafActivity = false;
        raf && cancelAnimationFrame(raf);
      }
    },
    isActive: (): boolean => rafActivity,
  };

  return result;
}
