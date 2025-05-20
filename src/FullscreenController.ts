import { EventEmitter } from '@js-toolkit/utils/EventEmitter';
import { hasIn } from '@js-toolkit/utils/hasIn';
import { toggleNativeSubtitles } from './media/toggleNativeSubtitles';
import { fullscreen } from './fullscreen';
import { enterPseudoFullscreen } from './fullscreenUtils';

declare global {
  interface HTMLMediaElement {
    webkitEnterFullscreen?: VoidFunction | undefined;
    webkitExitFullscreen?: VoidFunction | undefined;
    webkitDisplayingFullscreen?: boolean | undefined;
    webkitSupportsFullscreen?: boolean | undefined;
  }
}

export class FullscreenController
  extends EventEmitter<FullscreenController.EventMap>
  implements AsyncDisposable
{
  static isApiAvailable(): boolean {
    return fullscreen.isApiEnabled();
  }

  // eslint-disable-next-line class-methods-use-this
  get Events(): typeof FullscreenController.Events {
    return FullscreenController.Events;
  }

  private fallback: FullscreenController.Options['fallback'];
  private exitPseudoFullscreen: ReturnType<typeof enterPseudoFullscreen> | undefined;

  constructor(
    private readonly element: Element,
    private options: FullscreenController.Options = {}
  ) {
    super();
    this.setOptions(options);
  }

  private unbind(): void {
    if (fullscreen.names) {
      const { names } = fullscreen;
      this.element.removeEventListener(names.changeEventName, this.nativeChangeHandler);
      this.element.removeEventListener(names.errorEventName, this.nativeErrorHandler);
    }

    if (this.fallback instanceof HTMLVideoElement) {
      this.fallback.removeEventListener('webkitbeginfullscreen', this.videoBeginFullscreenHandler);
      this.fallback.removeEventListener('webkitendfullscreen', this.videoEndFullscreenHandler);
      this.fallback = undefined;
    }
  }

  setOptions(options: FullscreenController.Options): void {
    this.unbind();

    this.options = options ?? {};
    this.fallback = this.options.fallback;

    if (fullscreen.names && fullscreen.isApiEnabled()) {
      const { names } = fullscreen;
      this.element.addEventListener(names.changeEventName, this.nativeChangeHandler);
      this.element.addEventListener(names.errorEventName, this.nativeErrorHandler);
    }
    // Use video if regular fullscreen api unavailable (probably ios).
    else if (this.fallback instanceof HTMLVideoElement) {
      this.fallback.addEventListener('webkitbeginfullscreen', this.videoBeginFullscreenHandler);
      this.fallback.addEventListener('webkitendfullscreen', this.videoEndFullscreenHandler);
    }
  }

  isAvailable(): boolean {
    return (
      fullscreen.isApiEnabled() ||
      this.fallback === 'pseudo' ||
      (this.fallback instanceof HTMLVideoElement &&
        !!this.fallback.webkitEnterFullscreen &&
        !!this.fallback.webkitSupportsFullscreen)
    );
  }

  isFullscreen(): boolean {
    return !!this.getCurrentElement();
  }

  isPseudoFullscreen(): boolean {
    return this.isFullscreen() && !!this.exitPseudoFullscreen;
  }

  getCurrentElement(): Element | null {
    if (fullscreen.isApiEnabled()) {
      if (fullscreen.getElement() === this.element) return this.element;
    } else if (this.exitPseudoFullscreen) {
      return this.element;
    } else if (
      this.fallback instanceof HTMLVideoElement &&
      this.fallback.webkitDisplayingFullscreen
    ) {
      return this.fallback;
    }
    return null;
  }

  private nativeChangeHandler = (): void => {
    this.emit(this.Events.Change, { fullscreen: this.isFullscreen(), type: 'native' });
  };

  private nativeErrorHandler = (event: Event): void => {
    this.emit(this.Events.Error, { error: event, type: 'native' });
  };

  private videoBeginFullscreenHandler = (() => {
    const handler = (): void => {
      const video = this.fallback as HTMLVideoElement;

      handler.controls = video.controls;
      handler.nativeSubtitles =
        hasIn(this.options, 'toggleNativeSubtitles') &&
        this.options.toggleNativeSubtitles &&
        video.textTracks.length > 0;

      if (handler.nativeSubtitles) toggleNativeSubtitles(true, video.textTracks);

      this.emit(this.Events.Change, { fullscreen: true, type: 'video' });
    };

    handler.nativeSubtitles = undefined as boolean | undefined;
    handler.controls = undefined as boolean | undefined;

    return handler;
  })();

  private videoEndFullscreenHandler = (): void => {
    const video = this.fallback as HTMLVideoElement;
    // Fix swiped exit fullscreen
    if (this.videoBeginFullscreenHandler.controls != null) {
      video.controls = this.videoBeginFullscreenHandler.controls;
    }
    if (this.videoBeginFullscreenHandler.nativeSubtitles) {
      toggleNativeSubtitles(false, video.textTracks);
    }
    this.emit(this.Events.Change, { fullscreen: false, type: 'video' });
  };

  request(options: FullscreenController.RequestOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isFullscreen()) {
        resolve();
        return;
      }

      if (fullscreen.isApiEnabled()) {
        fullscreen.request(this.element, options).then(resolve).catch(reject);
        return;
      }

      if (this.fallback === 'pseudo') {
        this.exitPseudoFullscreen = enterPseudoFullscreen(this.element as HTMLElement);
        this.emit(this.Events.Change, { fullscreen: true, type: 'pseudo' });
        resolve();
        return;
      }

      const video = (this.fallback instanceof HTMLVideoElement && this.fallback) || undefined;
      if (video?.webkitEnterFullscreen && video.webkitSupportsFullscreen) {
        const beginFullscreenHandler = (): void => {
          video.removeEventListener('webkitbeginfullscreen', beginFullscreenHandler);
          resolve();
        };

        video.addEventListener('webkitbeginfullscreen', beginFullscreenHandler);
        video.webkitEnterFullscreen();

        return;
      }

      reject(new fullscreen.UnavailableError());
    });
  }

  exit(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isFullscreen()) {
        resolve();
        return;
      }

      if (fullscreen.isApiEnabled()) {
        fullscreen.exit().then(resolve).catch(reject);
        return;
      }

      if (this.exitPseudoFullscreen) {
        this.exitPseudoFullscreen();
        this.exitPseudoFullscreen = undefined;
        this.emit(this.Events.Change, { fullscreen: false, type: 'pseudo' });
        resolve();
        return;
      }

      const video = (this.fallback instanceof HTMLVideoElement && this.fallback) || undefined;
      if (video?.webkitExitFullscreen && video.webkitSupportsFullscreen) {
        const endFullscreenHandler = (): void => {
          video.removeEventListener('webkitendfullscreen', endFullscreenHandler);
          resolve();
        };

        video.addEventListener('webkitendfullscreen', endFullscreenHandler);
        video.webkitExitFullscreen();

        return;
      }

      reject(new fullscreen.UnavailableError());
    });
  }

  destroy(): Promise<void> {
    return this.exit().then(() => {
      // Because of unbind is calling before the change event will be fired.
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          this.removeAllListeners();
          this.unbind();
          resolve();
        });
      });
    });
  }

  [Symbol.asyncDispose](): PromiseLike<void> {
    return this.destroy();
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FullscreenController {
  export type FullscreenType = 'video' | 'pseudo' | 'native';

  export type Options =
    | {
        readonly fallback?: ExtractStrict<FullscreenType, 'pseudo'> | undefined;
      }
    | {
        readonly fallback: HTMLVideoElement;
        /** Used for iOS. */
        readonly toggleNativeSubtitles?: boolean | undefined;
      };

  export type RequestOptions = Readonly<FullscreenOptions>;

  export enum Events {
    Change = 'change',
    Error = 'error',
  }

  export type EventMap = EventEmitter.EventMap<
    DefineAll<
      Events,
      {
        [Events.Change]: [{ fullscreen: boolean; type: FullscreenType }];
        [Events.Error]: [{ error: unknown; type: FullscreenType }];
      }
    >,
    FullscreenController
  >;

  export type EventHandler<T extends Events = Events> = EventEmitter.EventListener<
    EventMap,
    T,
    FullscreenController
  >;

  export type EventHandlerMap<T extends Events = Events> = {
    [P in T]: EventHandler<P>;
  };
}
