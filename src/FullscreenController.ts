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
  /** Used for iOS */
  readonly toggleNativeVideoSubtitles?: boolean;
}

export default class FullscreenController extends EventEmitter<FullscreenControllerEventMap> {
  readonly Events = FullscreenControllerEvent;

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
    return fullscreen.isEnabled;
  }

  get isFullscreen(): boolean {
    return fullscreen.names
      ? document[fullscreen.names.fullscreenElementName] === this.element
      : !!this.video?.webkitDisplayingFullscreen;
  }

  get currentElement(): Element | null {
    if (fullscreen.names) {
      if (document[fullscreen.names.fullscreenElementName] === this.element) return this.element;
    } else if (this.video?.webkitDisplayingFullscreen) {
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
    return new Promise((resolve, reject) => {
      if (this.isFullscreen) {
        resolve();
        return;
      }

      const { toggleNativeVideoSubtitles, ...rest } = options;

      if (fullscreen.isEnabled) {
        fullscreen.request(this.element, rest).then(resolve, reject);
        return;
      }

      const { video } = this;

      if (!video?.webkitEnterFullscreen) {
        reject(getFullscreenUnavailableError());
        return;
      }

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
    });
  }

  exit(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isFullscreen) {
        resolve();
        return;
      }

      if (fullscreen.isEnabled) {
        fullscreen.exit().then(resolve, reject);
        return;
      }

      const { video } = this;

      if (!video?.webkitExitFullscreen) {
        reject(getFullscreenUnavailableError());
        return;
      }

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
    });
  }
}
