import { EventEmitter } from 'eventemitter3';
import { EventEmitterListener } from './EventEmitterListener';

declare global {
  type VideoPresentationMode = 'inline' | 'picture-in-picture' | 'fullscreen';

  interface HTMLVideoElement {
    webkitSupportsPresentationMode?: ((mode: VideoPresentationMode) => boolean) | undefined;
    webkitPresentationMode: VideoPresentationMode;
    webkitSetPresentationMode: (mode: VideoPresentationMode) => void;
  }
}

const getPipUnavailableError = (): Error => new Error('PiP is not available');

export class PipController extends EventEmitter<PipController.EventMap> {
  private static get isSupported(): boolean {
    return (
      !!HTMLVideoElement.prototype.requestPictureInPicture &&
      !!document.exitPictureInPicture &&
      !!document.pictureInPictureEnabled
    );
  }

  static isEnabled(video: HTMLVideoElement): boolean {
    return (
      this.isSupported ||
      (!!video.webkitSupportsPresentationMode &&
        video.webkitSupportsPresentationMode('picture-in-picture'))
    );
  }

  // eslint-disable-next-line class-methods-use-this
  get Events(): typeof PipController.Events {
    return PipController.Events;
  }

  private readonly listener: EventEmitterListener<HTMLVideoElement>;

  constructor(video: HTMLVideoElement) {
    super();

    this.listener = new EventEmitterListener(video);

    if (PipController.isEnabled(video)) {
      const enterPipHandler = (): void => {
        this.emit(this.Events.Change, { isPip: true });
      };

      const exitPipHandler = (): void => {
        this.emit(this.Events.Change, { isPip: false });
      };

      if (PipController.isSupported) {
        this.listener.on('enterpictureinpicture', enterPipHandler);
        this.listener.on('leavepictureinpicture', exitPipHandler);
      } else {
        this.listener.on(
          'webkitpresentationmodechanged',
          (() => {
            let lastMode = this.listener.target.webkitPresentationMode;
            return () => {
              if (this.listener.target.webkitPresentationMode === 'picture-in-picture') {
                enterPipHandler();
              } else if (lastMode === 'picture-in-picture') {
                exitPipHandler();
              }
              lastMode = this.listener.target.webkitPresentationMode;
            };
          })(),
          true
        );
      }
    }
  }

  destroy(): Promise<void> {
    return this.exit().finally(() => {
      this.removeAllListeners();
      this.listener.removeAllListeners();
    });
  }

  get isPip(): boolean {
    return PipController.isSupported
      ? document.pictureInPictureElement === this.listener.target
      : this.listener.target.webkitPresentationMode === 'picture-in-picture';
  }

  get currentElement(): HTMLVideoElement | null {
    if (this.isPip) {
      return this.listener.target;
    }
    return null;
  }

  request(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isPip) {
        resolve();
        return;
      }

      if (PipController.isSupported) {
        this.listener.target.requestPictureInPicture().then(() => resolve(), reject);
        return;
      }

      if (!PipController.isEnabled(this.listener.target)) {
        throw getPipUnavailableError();
      }

      this.listener.once(
        'webkitpresentationmodechanged',
        () => {
          if (this.listener.target.webkitPresentationMode === 'picture-in-picture') resolve();
          else reject(new Error('Something went wrong.'));
        },
        true
      );
      this.listener.target.webkitSetPresentationMode('picture-in-picture');
    });
  }

  exit(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isPip) {
        resolve();
        return;
      }

      if (PipController.isSupported) {
        document.exitPictureInPicture().then(resolve, reject);
        return;
      }

      if (!PipController.isEnabled(this.listener.target)) {
        throw getPipUnavailableError();
      }

      this.listener.once(
        'webkitpresentationmodechanged',
        () => {
          if (this.listener.target.webkitPresentationMode !== 'picture-in-picture') resolve();
          else reject(new Error('Something went wrong.'));
        },
        true
      );
      this.listener.target.webkitSetPresentationMode('inline');
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PipController {
  export enum Events {
    Change = 'change',
  }

  export type EventMap = {
    [Events.Change]: [{ isPip: boolean }];
  };
}
