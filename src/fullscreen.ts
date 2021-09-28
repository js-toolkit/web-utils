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

  return fnNames.find(({ exitFullscreenName }) => exitFullscreenName in document);
})();

export type FullscreenEventTypes = 'change' | 'error';

const eventNameMap: Record<FullscreenEventTypes, string | undefined> = {
  change: fullscreenFnNames?.changeEventName,
  error: fullscreenFnNames?.errorEventName,
};

export const getFullscreenUnavailableError = (): Error => new Error('Fullscreen is not available');

export default {
  names: fullscreenFnNames,

  get isEnabled(): boolean {
    // Coerce to boolean in case of old WebKit
    return !!fullscreenFnNames && Boolean(document[fullscreenFnNames.fullscreenEnabledName]);
  },

  get isFullscreen(): boolean {
    if (!fullscreenFnNames) throw getFullscreenUnavailableError();
    return Boolean(document[fullscreenFnNames.fullscreenElementName]);
  },

  get element(): Element | null | undefined {
    if (!fullscreenFnNames) throw getFullscreenUnavailableError();
    return document[fullscreenFnNames.fullscreenElementName] as Element;
  },

  request(element: Element, options?: FullscreenOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fullscreenFnNames) {
        throw getFullscreenUnavailableError();
      }

      const onFullScreenEntered = (): void => {
        this.off('change', onFullScreenEntered);
        this.off('error', onFullScreenError); // eslint-disable-line no-use-before-define
        resolve();
      };
      const onFullScreenError = (event: unknown): void => {
        this.off('change', onFullScreenEntered);
        this.off('error', onFullScreenError);
        reject(event);
      };

      this.on('change', onFullScreenEntered);
      this.on('error', onFullScreenError);

      const result = (element[fullscreenFnNames.requestFullscreenName] as AnyAsyncFunction)(
        options
      );

      if (result instanceof Promise) {
        result.then(onFullScreenEntered, onFullScreenError);
      }
    });
  },

  exit(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fullscreenFnNames) {
        throw getFullscreenUnavailableError();
      }
      if (!this.isFullscreen) {
        resolve();
        return;
      }

      const onFullScreenExit = (): void => {
        this.off('change', onFullScreenExit);
        this.off('error', onFullScreenError); // eslint-disable-line no-use-before-define
        resolve();
      };
      const onFullScreenError = (event: unknown): void => {
        this.off('change', onFullScreenExit);
        this.off('error', onFullScreenError);
        reject(event);
      };

      this.on('change', onFullScreenExit);
      this.on('error', onFullScreenError);

      const result = (document[fullscreenFnNames.exitFullscreenName] as AnyAsyncFunction)();

      if (result instanceof Promise) {
        result.then(onFullScreenExit, onFullScreenError);
      }
    });
  },

  toggle(element: Element): Promise<void> {
    return Promise.resolve().then(() => (this.isFullscreen ? this.exit() : this.request(element)));
  },

  onChange(listener: EventListenerOrEventListenerObject): void {
    this.on('change', listener);
  },

  onError(listener: EventListenerOrEventListenerObject): void {
    this.on('error', listener);
  },

  on(
    type: FullscreenEventTypes,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    const eventName = eventNameMap[type];
    eventName && document.addEventListener(eventName, listener, options);
  },

  off(
    type: FullscreenEventTypes,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    const eventName = eventNameMap[type];
    eventName && document.removeEventListener(eventName, listener, options);
  },
};
