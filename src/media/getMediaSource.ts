/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface ManagedMediaSourceEventMap extends MediaSourceEventMap {
    startstreaming: Event;
    endstreaming: Event;
  }

  interface ManagedMediaSource extends MediaSource {
    readonly streaming: boolean;
    onstartstreaming: ((this: ManagedMediaSource, ev: Event) => any) | null;
    onendstreaming: ((this: ManagedMediaSource, ev: Event) => any) | null;
    addEventListener<K extends keyof ManagedMediaSourceEventMap>(
      type: K,
      listener: (this: MediaSource, ev: ManagedMediaSourceEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof ManagedMediaSourceEventMap>(
      type: K,
      listener: (this: MediaSource, ev: ManagedMediaSourceEventMap[K]) => any,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface Window {
    // WebKitMediaSource?: typeof MediaSource;
    ManagedMediaSource?: ManagedMediaSource & typeof MediaSource;
  }
}

export function getMediaSource(
  /**
   * `prefer` - returns ManagedMediaSource or MediaSource.
   * `maybe` - returns ManagedMediaSource.
   *  Otherwise returns MediaSource.
   */
  managedMediaSource?: 'prefer' | 'maybe'
): typeof MediaSource | undefined {
  if (managedMediaSource === 'maybe') return window.ManagedMediaSource;
  return (managedMediaSource === 'prefer' && window.ManagedMediaSource) || window.MediaSource; // || window.WebKitMediaSource;
}
