/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmptyObject } from '@js-toolkit/utils/isEmptyObject';

export type DomEventTarget = EventTarget;

export type EventTargetLike = {
  addEventListener: EventEmitterLike['on'];
  removeEventListener: EventEmitterLike['off'];
};

export type EventEmitterLike = {
  on: (type: any, listener: AnyFunction, ...rest: any[]) => void;
  once?: ((type: any, listener: AnyFunction, ...rest: any[]) => void) | undefined;
  off: (type: any, listener: AnyFunction, ...rest: any[]) => void;
};

export type EmitterTarget = DomEventTarget | EventTargetLike | EventEmitterLike;

export type GetDomEventType<T extends DomEventTarget> = T['addEventListener'] extends {
  (
    type: infer K,
    listener: (this: T, ev: any) => any,
    options?: boolean | AddEventListenerOptions | undefined
  ): void;
  (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined
  ): void;
}
  ? K
  : string;

export type GetDomEventListener<E, EM extends AnyObject> = (
  ev: E extends keyof EM ? EM[E] : Event,
  ...rest: unknown[]
) => unknown;

export type GetEventType<T extends EmitterTarget> = T extends DomEventTarget
  ? GetDomEventType<T>
  : T extends EventEmitterLike
    ? T['on'] extends { (type: infer K, listener: AnyFunction, ...rest: unknown[]): unknown }
      ? K
      : string
    : T extends EventTargetLike
      ? T['addEventListener'] extends {
          (type: infer K, listener: AnyFunction, ...rest: unknown[]): unknown;
        }
        ? K
        : string
      : string;

export type GetEventListener<
  T extends EmitterTarget,
  E,
  EM extends AnyObject = GetEventMap<T>,
> = T extends DomEventTarget
  ? IfExtends<EM, EmptyObject, EventListener, GetDomEventListener<E, EM>>
  : IfExtends<
      EM,
      EmptyObject,
      Parameters<
        T extends EventTargetLike
          ? T['addEventListener']
          : T extends EventEmitterLike
            ? T['on']
            : AnyFunction
      >['1'],
      (event: E extends keyof EM ? EM[E] : unknown, ...rest: any[]) => unknown
    >;

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
                                : T extends { EventMap: Record<string, any> }
                                  ? T['EventMap']
                                  : EmptyObject;

export function isEventTargetLike(target: EmitterTarget): target is EventTargetLike {
  return (
    (target as EventTargetLike).addEventListener !== undefined &&
    (target as EventTargetLike).removeEventListener !== undefined
  );
}

export function isDomEventTarget(target: EmitterTarget): target is DomEventTarget {
  return isEventTargetLike(target) && (target as DomEventTarget).dispatchEvent !== undefined;
}

export function isEventEmitterLike(target: EmitterTarget): target is EventEmitterLike {
  return (
    !isEventTargetLike(target) &&
    !isDomEventTarget(target) &&
    target.on !== undefined &&
    target.once !== undefined &&
    target.off !== undefined
  );
}

let passiveSupported = false;

export function isPassiveSupported(): boolean {
  return passiveSupported;
}

try {
  const options: AddEventListenerOptions = {
    get passive() {
      passiveSupported = true;
      return false;
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
