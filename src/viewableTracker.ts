import throttleFn from 'lodash.throttle';

export interface ViewableTrackerOptions {
  /** Visibility part to detect state as viewable. Up to 1. */
  readonly visiblePart?: boolean | number | undefined;
  // readonly invisiblePart?: boolean | number | undefined;
  readonly scrollThrottle?: number | undefined;
  readonly documentVisibility?: boolean | undefined;
  readonly onChange: (viewable: boolean) => void;
}

export interface ViewableTracker extends Disposable {
  readonly check: VoidFunction;
  readonly destroy: VoidFunction;
}

export function getViewableTracker(
  element: HTMLElement,
  {
    visiblePart: visiblePartOption = 0.8,
    scrollThrottle = 200,
    documentVisibility = true,
    onChange,
  }: ViewableTrackerOptions
): ViewableTracker {
  const visiblePart = Math.min(+visiblePartOption, 1);
  // const visiblePart = +visiblePartOption;
  let raf = 0;
  let lastViewable: boolean | undefined;
  let lastDocumentViewable = document.visibilityState === 'visible';

  const checkVisibility = (): void => {
    if (documentVisibility && document.visibilityState !== 'visible') return;
    const { top, bottom, height } = element.getBoundingClientRect();
    const visibleHeight = height * visiblePart;
    const bottomPos = top + visibleHeight;
    const viewable = window.innerHeight >= bottomPos && bottom > visibleHeight;
    // console.log(bottomPos, top, bottom, visibleHeight, viewable);
    if (lastViewable !== viewable) {
      lastViewable = viewable;
      onChange(viewable);
    }
  };

  const checkVisibilityRaf = (): void => {
    if (documentVisibility && document.visibilityState !== 'visible') return;
    raf = window.requestAnimationFrame(checkVisibility);
  };

  const checkDocumentVisibility = (): void => {
    const viewable = document.visibilityState === 'visible';
    if (lastDocumentViewable === viewable) return;
    lastDocumentViewable = viewable;
    // Check if visible on page
    if (viewable /* && visiblePart > 0 */) {
      // Always re-check, the page size may be changed or something else.
      lastViewable = undefined;
      checkVisibility();
    }
    // Hidden tab
    else if (/* visiblePart <= 0 || */ lastViewable !== viewable) {
      onChange(viewable);
    }
  };

  const handler =
    scrollThrottle && scrollThrottle > 0
      ? throttleFn(checkVisibility, scrollThrottle)
      : checkVisibilityRaf;

  // if (visiblePart > 0) {
  window.addEventListener('scroll', handler, { capture: false, passive: true });
  // }

  if (documentVisibility) {
    document.addEventListener('visibilitychange', checkDocumentVisibility);
  }

  const check = (): void => {
    // if (visiblePart > 0) {
    checkVisibility();
    // }
    if (documentVisibility) {
      checkDocumentVisibility();
    }
  };

  const destroy = (): void => {
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', handler, { capture: false });
    document.removeEventListener('visibilitychange', checkDocumentVisibility);
  };

  return {
    check,
    destroy,
    [Symbol.dispose](): void {
      this.destroy();
    },
  };
}
