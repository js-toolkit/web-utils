import isEmptyObject from '@js-toolkit/utils/isEmptyObject';

export type GetEventType<T extends EventTarget> = T['addEventListener'] extends {
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
  : T extends BroadcastChannel
  ? BroadcastChannelEventMap
  : T extends EventSource
  ? EventSourceEventMap
  : EmptyObject;

let passiveSupported = false;

export function isPassiveSupported(): boolean {
  return passiveSupported;
}

try {
  const options: AddEventListenerOptions = Object.defineProperty({}, 'passive', {
    get() {
      passiveSupported = true;
    },
  });
  window.addEventListener(
    'test' as keyof WindowEventMap,
    null as unknown as EventListener,
    options
  );
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
