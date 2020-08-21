export interface FullscreenFnNames {
  readonly requestFullscreenName: string;
  readonly exitFullscreenName: string;
  readonly fullscreenElementName: string;
  readonly fullscreenEnabledName: string;
  readonly changeEventName: string;
  readonly errorEventName: string;
}

const fullscreenFnNames: FullscreenFnNames | undefined = (() => {
  const fnNames: FullscreenFnNames[] = [
    {
      requestFullscreenName: 'requestFullscreen',
      exitFullscreenName: 'exitFullscreen',
      fullscreenElementName: 'fullscreenElement',
      fullscreenEnabledName: 'fullscreenEnabled',
      changeEventName: 'fullscreenchange',
      errorEventName: 'fullscreenerror',
    },
    // New WebKit
    {
      requestFullscreenName: 'webkitRequestFullscreen',
      exitFullscreenName: 'webkitExitFullscreen',
      fullscreenElementName: 'webkitFullscreenElement',
      fullscreenEnabledName: 'webkitFullscreenEnabled',
      changeEventName: 'webkitfullscreenchange',
      errorEventName: 'webkitfullscreenerror',
    },
    // Old WebKit
    {
      requestFullscreenName: 'webkitRequestFullScreen',
      exitFullscreenName: 'webkitCancelFullScreen',
      fullscreenElementName: 'webkitCurrentFullScreenElement',
      fullscreenEnabledName: 'webkitCancelFullScreen',
      changeEventName: 'webkitfullscreenchange',
      errorEventName: 'webkitfullscreenerror',
    },
    {
      requestFullscreenName: 'mozRequestFullScreen',
      exitFullscreenName: 'mozCancelFullScreen',
      fullscreenElementName: 'mozFullScreenElement',
      fullscreenEnabledName: 'mozFullScreenEnabled',
      changeEventName: 'mozfullscreenchange',
      errorEventName: 'mozfullscreenerror',
    },
    {
      requestFullscreenName: 'msRequestFullscreen',
      exitFullscreenName: 'msExitFullscreen',
      fullscreenElementName: 'msFullscreenElement',
      fullscreenEnabledName: 'msFullscreenEnabled',
      changeEventName: 'MSFullscreenChange',
      errorEventName: 'MSFullscreenError',
    },
  ];

  return fnNames.find((names) => names[1] in document);
})();

export type FullscreenEventTypes = 'change' | 'error';

const eventNameMap: Record<FullscreenEventTypes, string | undefined> = {
  change: fullscreenFnNames?.changeEventName,
  error: fullscreenFnNames?.errorEventName,
};

const getError = (): Error => new Error('Fullscreen is not available');

export default {
  names: fullscreenFnNames,

  get isEnabled(): boolean {
    // Coerce to boolean in case of old WebKit
    return !!fullscreenFnNames && Boolean(document[fullscreenFnNames.fullscreenEnabledName]);
  },

  get isFullscreen(): boolean {
    if (!fullscreenFnNames) throw getError();
    return Boolean(document[fullscreenFnNames.fullscreenElementName]);
  },

  get element(): Element {
    if (!fullscreenFnNames) throw getError();
    return document[fullscreenFnNames.fullscreenElementName] as Element;
  },

  request(element: Element, options?: FullscreenOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fullscreenFnNames) {
        reject(getError);
        return;
      }

      const onFullScreenEntered = (): void => {
        this.off('change', onFullScreenEntered);
        resolve();
      };

      this.on('change', onFullScreenEntered);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = element[fullscreenFnNames.requestFullscreenName](options) as unknown;

      if (result instanceof Promise) {
        result.then(onFullScreenEntered).catch(reject);
      }
    });
  },

  exit(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isFullscreen) {
        resolve();
        return;
      }
      if (!fullscreenFnNames) {
        reject(getError);
        return;
      }

      const onFullScreenExit = (): void => {
        this.off('change', onFullScreenExit);
        resolve();
      };

      this.on('change', onFullScreenExit);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = document[fullscreenFnNames.exitFullscreenName]() as unknown;

      if (result instanceof Promise) {
        result.then(onFullScreenExit).catch(reject);
      }
    });
  },

  toggle(element: Element): Promise<void> {
    return this.isFullscreen ? this.exit() : this.request(element);
  },

  onChange(callback: VoidFunction): void {
    this.on('change', callback);
  },

  onError(callback: VoidFunction): void {
    this.on('error', callback);
  },

  on(
    type: FullscreenEventTypes,
    callback: VoidFunction,
    options?: boolean | AddEventListenerOptions
  ): void {
    const eventName = eventNameMap[type];
    if (eventName) {
      document.addEventListener(eventName, callback, options);
    }
  },

  off(
    type: FullscreenEventTypes,
    callback: VoidFunction,
    options?: boolean | EventListenerOptions
  ): void {
    const eventName = eventNameMap[type];
    if (eventName) {
      document.removeEventListener(eventName, callback, options);
    }
  },
};
