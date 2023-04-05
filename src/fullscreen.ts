import es5ErrorCompat from '@jstoolkit/utils/es5ErrorCompat';

export class FullscreenUnavailableError extends Error {
  constructor() {
    super('Fullscreen is not available');
    es5ErrorCompat(this, FullscreenUnavailableError);
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace fullscreen {
  interface FnNames {
    readonly requestFullscreenName: string;
    readonly exitFullscreenName: string;
    readonly fullscreenElementName: string;
    readonly fullscreenEnabledName: string;
    readonly changeEventName: string;
    readonly errorEventName: string;
  }

  export const names: FnNames | undefined = (() => {
    const fnNames: FnNames[] = [
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

  export type EventType = 'change' | 'error';

  const eventNameMap: Record<EventType, string | undefined> = {
    change: names?.changeEventName,
    error: names?.errorEventName,
  };

  export const UnavailableError = FullscreenUnavailableError;

  export function isSupported(): boolean {
    return !!names;
  }

  export function isEnabled(): boolean {
    // Coerce to boolean in case of old WebKit
    return !!names && Boolean((document as AnyObject)[names.fullscreenEnabledName]);
  }

  export function isFullscreen(): boolean {
    if (!names) throw new UnavailableError();
    return Boolean((document as AnyObject)[names.fullscreenElementName]);
  }

  export function getElement(): Element | null | undefined {
    if (!names) throw new UnavailableError();
    return (document as AnyObject)[names.fullscreenElementName] as Element;
  }

  export function on(
    type: EventType,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined
  ): void {
    const eventName = eventNameMap[type];
    eventName && document.addEventListener(eventName, listener, options);
  }

  export function off(
    type: EventType,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions | undefined
  ): void {
    const eventName = eventNameMap[type];
    eventName && document.removeEventListener(eventName, listener, options);
  }

  export function request(elem: Element, options?: FullscreenOptions | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!names) {
        throw new UnavailableError();
      }

      const onFullScreenEntered = (): void => {
        off('change', onFullScreenEntered);
        off('error', onFullScreenError); // eslint-disable-line no-use-before-define
        resolve();
      };
      const onFullScreenError = (event: unknown): void => {
        off('change', onFullScreenEntered);
        off('error', onFullScreenError);
        reject(event);
      };

      on('change', onFullScreenEntered);
      on('error', onFullScreenError);

      const result = ((elem as AnyObject)[names.requestFullscreenName] as AnyAsyncFunction)(
        options
      );

      if (result instanceof Promise) {
        result.then(onFullScreenEntered, onFullScreenError);
      }
    });
  }

  export function exit(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!names) {
        throw new UnavailableError();
      }
      if (!isFullscreen) {
        resolve();
        return;
      }

      const onFullScreenExit = (): void => {
        off('change', onFullScreenExit);
        off('error', onFullScreenError);
        resolve();
      };
      const onFullScreenError = (event: unknown): void => {
        off('change', onFullScreenExit);
        off('error', onFullScreenError);
        reject(event);
      };

      on('change', onFullScreenExit);
      on('error', onFullScreenError);

      const result = ((document as AnyObject)[names.exitFullscreenName] as AnyAsyncFunction)();

      if (result instanceof Promise) {
        result.then(onFullScreenExit, onFullScreenError);
      }
    });
  }

  export function toggle(elem: Element): Promise<void> {
    return Promise.resolve().then(() => (isFullscreen() ? exit() : request(elem)));
  }

  export function onChange(listener: EventListenerOrEventListenerObject): void {
    on('change', listener);
  }

  export function onError(listener: EventListenerOrEventListenerObject): void {
    on('error', listener);
  }
}

export default fullscreen;
