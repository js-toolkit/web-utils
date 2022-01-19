import EventEmitter, { EventListener } from 'eventemitter3';
import fullscreen from './fullscreen';
import toggleNativeSubtitles from './toggleNativeSubtitles';

declare global {
  interface HTMLVideoElement {
    webkitEnterFullscreen?: () => void;
    webkitExitFullscreen?: () => void;
    webkitDisplayingFullscreen?: boolean;
    // webkitSupportsFullscreen?: boolean;
  }
}

export enum FullscreenControllerEvent {
  Change = 'change',
  Error = 'error',
}

type FullscreenControllerEventMap = {
  [FullscreenControllerEvent.Change]: [
    { isFullscreen: boolean; video?: boolean; pseudo?: boolean }
  ];
  [FullscreenControllerEvent.Error]: [{ error: unknown; video?: boolean; pseudo?: boolean }];
};

export interface FullscreenRequestOptions extends Readonly<FullscreenOptions> {
  /** Used for iOS */
  readonly toggleNativeVideoSubtitles?: boolean;
  readonly pseudoFullscreenFallback?: boolean;
}

class FullscreenController extends EventEmitter<FullscreenControllerEventMap> {
  readonly Events = FullscreenControllerEvent;

  private pseudo:
    | Pick<CSSStyleDeclaration, 'position' | 'left' | 'top' | 'width' | 'height' | 'zIndex'>
    | undefined = undefined;

  constructor(private readonly element: Element, private readonly video?: HTMLVideoElement) {
    super();
    if (fullscreen.names) {
      const { names } = fullscreen;
      element.addEventListener(names.changeEventName, this.changeHandler);
      element.addEventListener(names.errorEventName, this.errorHandler);
    } else if (video) {
      video.addEventListener('webkitbeginfullscreen', this.beginFullscreenHandler);
      video.addEventListener('webkitendfullscreen', this.endFullscreenHandler);
    }
  }

  destroy(): Promise<void> {
    return this.exit().finally(() => {
      this.removeAllListeners();
      if (fullscreen.names) {
        const { names } = fullscreen;
        this.element.removeEventListener(names.changeEventName, this.changeHandler);
        this.element.removeEventListener(names.errorEventName, this.errorHandler);
      } else if (this.video) {
        this.video.removeEventListener('webkitbeginfullscreen', this.beginFullscreenHandler);
        this.video.removeEventListener('webkitendfullscreen', this.endFullscreenHandler);
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this
  get isFullscreenSupported(): boolean {
    return fullscreen.isEnabled();
  }

  get isFullscreen(): boolean {
    return !!this.currentElement;
  }

  get isPseudoFullscreen(): boolean {
    return this.isFullscreen && !!this.pseudo;
  }

  get currentElement(): Element | null {
    if (fullscreen.isSupported()) {
      if (fullscreen.getElement() === this.element) return this.element;
    } else if (this.video?.webkitDisplayingFullscreen) {
      return this.video;
    } else if (this.pseudo) {
      return this.element;
    }
    return null;
  }

  private changeHandler = (): void => {
    this.emit(FullscreenControllerEvent.Change, { isFullscreen: this.isFullscreen });
  };

  private errorHandler = (event: Event): void => {
    this.emit(FullscreenControllerEvent.Error, { error: event });
  };

  private beginFullscreenHandler = (): void => {
    this.emit(FullscreenControllerEvent.Change, { isFullscreen: true, video: true });
  };

  private endFullscreenHandler = (): void => {
    this.emit(FullscreenControllerEvent.Change, { isFullscreen: false, video: true });
  };

  request(options: FullscreenRequestOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isFullscreen) {
        resolve();
        return;
      }

      const { toggleNativeVideoSubtitles, pseudoFullscreenFallback, ...rest } = options;

      if (fullscreen.isEnabled()) {
        fullscreen.request(this.element, rest).then(resolve, reject);
        return;
      }

      const { video } = this;
      if (video?.webkitEnterFullscreen) {
        if (video.webkitDisplayingFullscreen) {
          resolve();
          return;
        }

        if (toggleNativeVideoSubtitles && video.textTracks.length > 0) {
          toggleNativeSubtitles(true, video.textTracks);

          const endFullscreenHandler = (): void => {
            video.removeEventListener('webkitendfullscreen', endFullscreenHandler);
            toggleNativeSubtitles(false, video.textTracks);
          };
          video.addEventListener('webkitendfullscreen', endFullscreenHandler);
        }

        const beginFullscreenHandler = (): void => {
          video.removeEventListener('webkitbeginfullscreen', beginFullscreenHandler);
          resolve();
        };

        video.addEventListener('webkitbeginfullscreen', beginFullscreenHandler);
        video.webkitEnterFullscreen();

        return;
      }

      if (pseudoFullscreenFallback) {
        if (this.pseudo) {
          resolve();
          return;
        }

        const el = this.element as HTMLElement;
        this.pseudo = {
          position: el.style.position,
          left: el.style.left,
          top: el.style.top,
          width: el.style.width,
          height: el.style.height,
          zIndex: el.style.zIndex,
        };
        el.style.position = 'fixed';
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = '100vw';
        el.style.height = '100vh';
        el.style.zIndex = '99999';

        this.emit(FullscreenControllerEvent.Change, { isFullscreen: true, pseudo: true });

        resolve();
        return;
      }

      reject(new fullscreen.UnavailableError());
    });
  }

  exit(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isFullscreen) {
        resolve();
        return;
      }

      if (fullscreen.isEnabled()) {
        fullscreen.exit().then(resolve, reject);
        return;
      }

      const { video } = this;
      if (video?.webkitExitFullscreen) {
        if (!video.webkitDisplayingFullscreen) {
          resolve();
          return;
        }

        const endFullscreenHandler = (): void => {
          video.removeEventListener('webkitendfullscreen', endFullscreenHandler);
          resolve();
        };

        video.addEventListener('webkitendfullscreen', endFullscreenHandler);
        video.webkitExitFullscreen();

        return;
      }

      if (this.pseudo) {
        const el = this.element as HTMLElement;
        el.style.position = this.pseudo.position;
        el.style.left = this.pseudo.left;
        el.style.top = this.pseudo.top;
        el.style.width = this.pseudo.width;
        el.style.height = this.pseudo.height;
        el.style.zIndex = this.pseudo.zIndex;
        this.pseudo = undefined;

        this.emit(FullscreenControllerEvent.Change, { isFullscreen: false, pseudo: true });

        resolve();
        return;
      }

      reject(new fullscreen.UnavailableError());
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace FullscreenController {
  export type EventMap = FullscreenControllerEventMap;
  export type EventHandler<T extends FullscreenControllerEvent = FullscreenControllerEvent> =
    EventListener<EventMap, T>;
  export type EventHandlerMap<T extends FullscreenControllerEvent = FullscreenControllerEvent> = {
    [P in T]: EventHandler<P>;
  };
}

export default FullscreenController;
