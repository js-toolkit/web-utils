export function isPageReady(): boolean {
  return document.readyState === 'complete';
}

/** @returns cancel wait function */
export function onPageReady(callback: VoidFunction): VoidFunction {
  if (isPageReady()) {
    callback();
  } else {
    window.addEventListener('load', callback, { once: true });
  }

  return (): void => {
    window.removeEventListener('load', callback);
  };
}
