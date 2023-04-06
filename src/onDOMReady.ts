/** @returns cancel wait function */
export function onDOMReady(callback: VoidFunction): VoidFunction {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }

  return (): void => {
    document.removeEventListener('DOMContentLoaded', callback);
  };
}

export default onDOMReady;
