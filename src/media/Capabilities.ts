import { getMediaSource } from './getMediaSource';

type ManagedMediaSourceOption = Parameters<typeof getMediaSource>[0];

export abstract class Capabilities {
  private static readonly supportMap = new Map<string, boolean>();
  private static readonly canPlayMap = new Map<string, boolean>();
  private static tmpVideo: HTMLVideoElement | undefined;
  private static cacheTimer: number | undefined;

  /** Check video element. Mime type and optional codecs. */
  static isCanPlayType(type: string): boolean {
    if (this.canPlayMap.has(type)) {
      return !!this.canPlayMap.get(type);
    }
    if (!this.tmpVideo) {
      this.tmpVideo = document.getElementsByTagName('video')[0] || document.createElement('video');
      // Release handle for GC work.
      window.clearTimeout(this.cacheTimer);
      this.cacheTimer = window.setTimeout(() => {
        this.tmpVideo = undefined;
      }, 1000);
    }
    const support = !!this.tmpVideo.canPlayType(type);
    this.supportMap.set(type, support);
    return support;
  }

  /** Check MediaSource. */
  static isTypeSupported(type: string, managedMediaSource?: ManagedMediaSourceOption): boolean {
    if (this.supportMap.has(type)) {
      return !!this.supportMap.get(type);
    }
    const mediaSource = getMediaSource(managedMediaSource);
    if (mediaSource) {
      const support = mediaSource.isTypeSupported(type);
      this.supportMap.set(type, support);
      return support;
    }
    return false;
  }

  static reset(): void {
    window.clearTimeout(this.cacheTimer);
    this.tmpVideo = undefined;
    this.supportMap.clear();
    this.canPlayMap.clear();
  }
}
