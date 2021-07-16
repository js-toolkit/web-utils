import EventEmitter from 'eventemitter3';
import fullscreen, { getFullscreenUnavailableError } from './fullscreen';
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

export type FullscreenControllerEventMap = {
  [FullscreenControllerEvent.Change]: [{ isFullscreen: boolean; video: boolean }];
  [FullscreenControllerEvent.Error]: [{ error: unknown; video: boolean }];
};

export interface FullscreenRequestOptions extends Readonly<FullscreenOptions> {
  /** Uses for iOS */
  readonly toggleNativeVideoSubtitles?: boolean;
}

export default class FullscreenController extends EventEmitter<FullscreenControllerEventMap> {
  constructor(private readonly element: Element, private readonly video: HTMLVideoElement) {
    super();
    if (fullscreen.names) {
      const { names } = fullscreen;
      element.addEventListener(names.changeEventName, this.changeHandler);
      element.addEventListener(names.errorEventName, this.errorHandler);
    } else {
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
      } else {
        this.video.removeEventListener('webkitbeginfullscreen', this.beginFullscreenHandler);
        this.video.removeEventListener('webkitendfullscreen', this.endFullscreenHandler);
      }
    });
  }

  get isFullscreen(): boolean {
    return fullscreen.names
      ? document[fullscreen.names.fullscreenElementName] === this.element
      : !!this.video.webkitDisplayingFullscreen;
  }

  get currentElement(): Element | null {
    if (fullscreen.names) {
      if (document[fullscreen.names.fullscreenElementName] === this.element) return this.element;
    } else if (this.video.webkitDisplayingFullscreen) {
      return this.video;
    }
    return null;
  }

  private changeHandler = (): void => {
    const { names } = fullscreen;
    if (!names) return;
    this.emit(FullscreenControllerEvent.Change, {
      isFullscreen: document[names.fullscreenElementName] === this.element,
      video: false,
    });
  };

  private errorHandler = (event: Event): void => {
    const { names } = fullscreen;
    if (!names) return;
    this.emit(FullscreenControllerEvent.Error, { error: event, video: false });
  };

  private beginFullscreenHandler = (): void => {
    this.emit(FullscreenControllerEvent.Change, { isFullscreen: true, video: true });
  };

  private endFullscreenHandler = (): void => {
    this.emit(FullscreenControllerEvent.Change, { isFullscreen: false, video: true });
  };

  request(options: FullscreenRequestOptions = {}): Promise<void> {
    const { toggleNativeVideoSubtitles, ...rest } = options;

    if (fullscreen.isEnabled) {
      return fullscreen.request(this.element, rest);
    }

    if (!this.video.webkitExitFullscreen) {
      return Promise.reject(getFullscreenUnavailableError());
    }

    if (this.video.webkitDisplayingFullscreen) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (toggleNativeVideoSubtitles && this.video.textTracks.length > 0) {
        toggleNativeSubtitles(true, this.video.textTracks);

        const endFullscreenHandler = (): void => {
          this.video.removeEventListener('webkitendfullscreen', endFullscreenHandler);
          toggleNativeSubtitles(false, this.video.textTracks);
        };
        this.video.addEventListener('webkitendfullscreen', endFullscreenHandler);
      }

      const beginFullscreenHandler = (): void => {
        this.video.removeEventListener('webkitbeginfullscreen', beginFullscreenHandler);
        resolve();
      };

      this.video.addEventListener('webkitbeginfullscreen', beginFullscreenHandler);
      this.video.webkitEnterFullscreen && this.video.webkitEnterFullscreen();
    });
  }

  exit(): Promise<void> {
    if (fullscreen.isEnabled) {
      return fullscreen.exit();
    }

    if (!this.video.webkitExitFullscreen) {
      return Promise.reject(getFullscreenUnavailableError());
    }

    if (!this.video.webkitDisplayingFullscreen) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const endFullscreenHandler = (): void => {
        this.video.removeEventListener('webkitendfullscreen', endFullscreenHandler);
        resolve();
      };

      this.video.addEventListener('webkitendfullscreen', endFullscreenHandler);
      this.video.webkitExitFullscreen && this.video.webkitExitFullscreen();
    });
  }
}
