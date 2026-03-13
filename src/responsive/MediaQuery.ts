/* eslint-disable @typescript-eslint/no-extraneous-class */
/* eslint-disable no-underscore-dangle */
import { MediaQueryListener, type MediaQueryEventHandler } from './MediaQueryListener';
import type { ViewSize } from './ViewSize';

export type { MediaQueryEvent, MediaQueryEventHandler } from './MediaQueryListener';

export abstract class MediaQuery {
  private static _listener: MediaQueryListener | undefined;

  static get listener(): MediaQueryListener {
    if (!this._listener) {
      throw new Error(
        'Media queries is not initialized. You should initialize it before by call `init` method.'
      );
    }
    return this._listener;
  }

  static get isInitialized(): boolean {
    return this._listener != null;
  }

  static get currentViewSize(): ViewSize {
    return this.listener.currentViewSize;
  }

  static get currentViewSizeValues(): ViewSize.Values {
    return this.listener.currentViewSizeQuery;
  }

  static addListener(listener: MediaQueryEventHandler): void {
    this.listener.addListener(listener);
  }

  static removeListener(listener: MediaQueryEventHandler): boolean {
    return this.listener.removeListener(listener);
  }

  /**
   * Init all media queries for handle changes.
   * Safe for multiple calls.
   */
  static init(): ViewSize {
    this._listener ??= new MediaQueryListener();
    return this.currentViewSize;
  }

  static destroy(): void {
    if (!this._listener) return;
    this._listener.destroy();
  }
}
