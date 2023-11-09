import { EventEmitter } from 'eventemitter3';
import { hasIn } from '@js-toolkit/utils/hasIn';
import { fullscreen } from './fullscreen';
import { toggleNativeSubtitles } from './media/toggleNativeSubtitles';

declare global {
  interface HTMLMediaElement {
    webkitEnterFullscreen?: VoidFunction | undefined;
    webkitExitFullscreen?: VoidFunction | undefined;
    webkitDisplayingFullscreen?: boolean | undefined;
    webkitSupportsFullscreen?: boolean | undefined;
  }
}

export function enterPseudoFullscreen(element: Element & ElementCSSInlineStyle): VoidFunction {
  let originStyle:
    | Pick<
        CSSStyleDeclaration,
        'position' | 'left' | 'top' | 'width' | 'height' | 'maxWidth' | 'maxHeight' | 'zIndex'
      >
    | undefined;
  let currentEl: (Element & ElementCSSInlineStyle) | undefined;

  originStyle = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
    height: element.style.height,
    maxWidth: element.style.maxWidth,
    maxHeight: element.style.maxHeight,
    zIndex: element.style.zIndex,
  };
  currentEl = element;
  currentEl.style.position = 'fixed';
  currentEl.style.left = '0px';
  currentEl.style.top = '0px';
  currentEl.style.width = '100%';
  currentEl.style.height = '100%';
  currentEl.style.maxWidth = '100%';
  currentEl.style.maxHeight = '100%';
  currentEl.style.zIndex = '99999';

  return () => {
    if (originStyle && currentEl) {
      currentEl.style.position = originStyle.position;
      currentEl.style.left = originStyle.left;
      currentEl.style.top = originStyle.top;
      currentEl.style.width = originStyle.width;
      currentEl.style.height = originStyle.height;
      currentEl.style.maxWidth = originStyle.maxWidth;
      currentEl.style.maxHeight = originStyle.maxHeight;
      currentEl.style.zIndex = originStyle.zIndex;
    }
    originStyle = undefined;
    currentEl = undefined;
  };
}

export class FullscreenController extends EventEmitter<FullscreenController.EventMap> {
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

  destroy(): Promise<void> {
    return this.exit().finally(() => {
      this.removeAllListeners();
      this.unbind();
    });
  }

  isFullscreenAvailable(): boolean {
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

  private videoBeginFullscreenHandler = (): void => {
    this.emit(this.Events.Change, { fullscreen: true, type: 'video' });
  };

  private videoEndFullscreenHandler = (): void => {
    this.emit(this.Events.Change, { fullscreen: false, type: 'video' });
  };

  request(options: FullscreenController.RequestOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isFullscreen()) {
        resolve();
        return;
      }

      if (fullscreen.isApiEnabled()) {
        fullscreen.request(this.element, options).then(resolve, reject);
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
        if (
          hasIn(this.options, 'toggleNativeSubtitles') &&
          this.options.toggleNativeSubtitles &&
          video.textTracks.length > 0
        ) {
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
        fullscreen.exit().then(resolve, reject);
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

  export interface RequestOptions extends Readonly<FullscreenOptions> {}

  export enum Events {
    Change = 'change',
    Error = 'error',
  }

  export type EventMap = DefineAll<
    Events,
    {
      [Events.Change]: [{ fullscreen: boolean; type: FullscreenType }];
      [Events.Error]: [{ error: unknown; type: FullscreenType }];
    }
  >;

  export type EventHandler<T extends Events = Events> = EventEmitter.EventListener<EventMap, T>;

  export type EventHandlerMap<T extends Events = Events> = {
    [P in T]: EventHandler<P>;
  };
}
