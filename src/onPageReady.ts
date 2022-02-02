/** @returns cancel wait function */
export default function onPageReady(callback: VoidFunction): VoidFunction {
  if (document.readyState === 'complete') {
    callback();
  } else {
    window.addEventListener('load', callback, { once: true });
  }

  return (): void => {
    window.removeEventListener('load', callback);
  };
}
