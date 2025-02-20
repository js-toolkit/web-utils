import type { getMediaSource } from './getMediaSource';

declare global {
  interface ManagedSourceBufferEventMap extends SourceBufferEventMap {
    bufferedchange: Event;
  }

  interface ManagedSourceBuffer extends SourceBuffer {
    onbufferedchange: ((this: ManagedSourceBuffer, ev: Event) => any) | null;
    addEventListener<K extends keyof ManagedSourceBufferEventMap>(
      type: K,
      listener: (this: ManagedSourceBuffer, ev: ManagedSourceBufferEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof ManagedSourceBufferEventMap>(
      type: K,
      listener: (this: ManagedSourceBuffer, ev: ManagedSourceBufferEventMap[K]) => any,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface Window {
    // WebKitSourceBuffer?: typeof SourceBuffer;
    ManagedSourceBuffer?: ManagedSourceBuffer & typeof SourceBuffer;
  }
}

type ManagedMediaSourceOption = Parameters<typeof getMediaSource>[0];

export function getSourceBuffer(
  managedSourceBuffer?: ManagedMediaSourceOption
): typeof SourceBuffer | undefined {
  if (
    (managedSourceBuffer === 'prefer' && !!window.ManagedSourceBuffer) ||
    (managedSourceBuffer === 'maybe' && !!window.ManagedSourceBuffer && !window.SourceBuffer)
  ) {
    return window.ManagedSourceBuffer;
  }
  return window.SourceBuffer; // || window.WebKitSourceBuffer;
}
