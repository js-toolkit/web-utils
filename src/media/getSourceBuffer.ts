/* eslint-disable @typescript-eslint/no-explicit-any */
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
  managedMediaSource?: ManagedMediaSourceOption
): typeof SourceBuffer | undefined {
  if (managedMediaSource === 'maybe') return window.ManagedSourceBuffer;
  return (managedMediaSource === 'prefer' && window.ManagedSourceBuffer) || window.SourceBuffer; // || window.WebKitSourceBuffer;
}
