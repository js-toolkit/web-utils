import { DataEventEmitter } from '@js-toolkit/utils/DataEventEmitter';
import { hasIn } from '@js-toolkit/utils/hasIn';

export class WakeLockController extends DataEventEmitter<
  {
    activated: [];
    deactivated: [];
    error: [{ error: unknown }];
  },
  WakeLockController
> {
  static isApiAvailable(): boolean {
    return hasIn(navigator, 'wakeLock') && navigator.wakeLock != null;
  }

  private wakelock: WakeLockSentinel | undefined;
  private releasing = false;
  /** Lock when document will be visible. */
  private relockOnVisible = false;

  private restoreWakeLock = (): void => {
    if (document.visibilityState === 'visible' && this.relockOnVisible) {
      this.relockOnVisible = false;
      this.request().catch((error) => this.emit('error', { error }));
    }
  };

  private onRelease = (): void => {
    if (!this.wakelock) return;
    this.wakelock.removeEventListener('release', this.onRelease);
    this.wakelock = undefined;
    // Unsubscribe only if document is visible else keep subscription to re-lock when document will be visible again.
    // Release the wakelock happens before `visibilitychange` callback.
    if (this.releasing) {
      document.removeEventListener('visibilitychange', this.restoreWakeLock);
    }
    // If not releasing via api
    else if (document.visibilityState === 'hidden') {
      this.relockOnVisible = true;
      document.addEventListener('visibilitychange', this.restoreWakeLock);
    }
    this.emit('deactivated');
  };

  isActive(): boolean {
    return !!this.wakelock && !this.wakelock.released;
  }

  async request(): Promise<void> {
    if (this.wakelock) return;
    try {
      this.wakelock = await navigator.wakeLock.request('screen');
    } catch (error: unknown) {
      // Probably do not have permissions.
      if (document.visibilityState === 'visible') throw error;
      // If trying to wakelock when document inactive.
      this.relockOnVisible = true;
      document.addEventListener('visibilitychange', this.restoreWakeLock);
      this.emit('error', { error });
      return;
    }
    this.relockOnVisible = false;
    this.wakelock.addEventListener('release', this.onRelease);
    this.emit('activated');
  }

  async release(): Promise<void> {
    if (!this.wakelock || this.wakelock.released) return;
    try {
      this.releasing = true;
      await this.wakelock.release();
      this.relockOnVisible = false;
    } finally {
      this.releasing = false;
    }
  }

  async destroy(): Promise<void> {
    await this.release();
    this.removeAllListeners();
  }

  [Symbol.asyncDispose](): PromiseLike<void> {
    return this.destroy();
  }
}
