import isEmptyObject from '@jstoolkit/utils/isEmptyObject';

export type DomEventTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export type GetEventType<T extends DomEventTarget> = T['addEventListener'] extends {
  (
    type: infer K,
    listener: (this: T, ev: any) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}
  ? K
  : string;

export type GetEventListener<E, EM extends AnyObject> = (
  ev: E extends keyof EM ? EM[E] : Event,
  ...rest: unknown[]
) => unknown;

export type GetEventMap<T> = T extends Document
  ? DocumentEventMap
  : T extends HTMLBodyElement
  ? HTMLBodyElementEventMap
  : T extends HTMLVideoElement
  ? HTMLVideoElementEventMap
  : T extends HTMLMediaElement
  ? HTMLMediaElementEventMap
  : T extends TextTrackList
  ? TextTrackListEventMap
  : T extends HTMLElement
  ? HTMLElementEventMap
  : T extends Element
  ? ElementEventMap
  : T extends Animation
  ? AnimationEventMap
  : T extends AbortSignal
  ? AbortSignalEventMap
  : T extends BroadcastChannel
  ? BroadcastChannelEventMap
  : T extends WebSocket
  ? WebSocketEventMap
  : T extends MediaStreamTrack
  ? MediaStreamTrackEventMap
  : T extends MediaStream
  ? MediaStreamEventMap
  : T extends EventSource
  ? EventSourceEventMap
  : T extends SourceBuffer
  ? SourceBufferEventMap
  : T extends SourceBufferList
  ? SourceBufferListEventMap
  : EmptyObject;

let passiveSupported = false;

export function isPassiveSupported(): boolean {
  return passiveSupported;
}

try {
  const options: AddEventListenerOptions = {
    get passive() {
      passiveSupported = true;
      return undefined;
    },
  };
  window.addEventListener('__testpassive__', null as unknown as EventListener, options);
  // eslint-disable-next-line no-empty
} catch (err) {}

export function normalizeOptions(
  options: boolean | AddEventListenerOptions | undefined
): typeof options {
  if (options && typeof options === 'object') {
    let result = options;
    if ('passive' in options && !passiveSupported) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passive, ...rest } = options;
      result = rest;
    }
    return isEmptyObject(result) ? undefined : result;
  }
  return options;
}
