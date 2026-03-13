/* eslint-disable @typescript-eslint/unified-signatures */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EventEmitter } from '@js-toolkit/utils/EventEmitter';
import { isEmptyObject } from '@js-toolkit/utils/isEmptyObject';

export type DomEventTarget = EventTarget;

export interface EventTargetLike {
  addEventListener: EventEmitterLike['on'];
  removeEventListener: EventEmitterLike['off'];
}

export interface EventEmitterLike {
  on: (type: any, listener: AnyFunction, ...rest: any[]) => void;
  once?: ((type: any, listener: AnyFunction, ...rest: any[]) => void) | undefined;
  off: (type: any, listener: AnyFunction, ...rest: any[]) => void;
}

export type EmitterTarget = DomEventTarget | EventTargetLike | EventEmitterLike;

export type GetDomEventType<T extends DomEventTarget> = T['addEventListener'] extends {
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

export type GetDomEventListener<E, EM extends AnyObject> = (
  ev: E extends keyof EM ? EM[E] : Event,
  ...rest: any[]
) => any;

/** https://github.com/microsoft/TypeScript/issues/32164 */
export type GetEventTypeFromFn<T> = T extends {
  (type: infer K1, listener: AnyFunction, ...rest: any[]): any;
  (type: infer K2, listener: AnyFunction, ...rest: any[]): any;
  (type: infer K3, listener: AnyFunction, ...rest: any[]): any;
  (type: infer K4, listener: AnyFunction, ...rest: any[]): any;
}
  ? K1 | K2 | K3 | K4
  : T extends {
        (type: infer K1, listener: AnyFunction, ...rest: any[]): any;
        (type: infer K2, listener: AnyFunction, ...rest: any[]): any;
        (type: infer K3, listener: AnyFunction, ...rest: any[]): any;
      }
    ? K1 | K2 | K3
    : T extends {
          (type: infer K1, listener: AnyFunction, ...rest: any[]): any;
          (type: infer K2, listener: AnyFunction, ...rest: any[]): any;
        }
      ? K1 | K2
      : T extends (type: infer K, listener: AnyFunction, ...rest: any[]) => any
        ? K
        : string;

export type GetEventType<T /* extends EmitterTarget */> = T extends DomEventTarget
  ? GetDomEventType<T>
  : T extends EventEmitterLike
    ? GetEventTypeFromFn<T['on']>
    : T extends EventTargetLike
      ? GetEventTypeFromFn<T['addEventListener']>
      : string;

export type GetEventListener<
  T /* extends EmitterTarget */,
  E,
  EM extends AnyObject = GetEventMap<T>,
> = T extends DomEventTarget
  ? IfExtends<EM, EmptyObject, EventListener, GetDomEventListener<E, EM>>
  : IfExtends<
      EM,
      EmptyObject,
      Parameters<
        T extends EventEmitterLike
          ? T['on']
          : T extends EventTargetLike
            ? T['addEventListener']
            : AnyFunction
      >['1'],
      (event: E extends keyof EM ? EM[E] : unknown, ...rest: any[]) => unknown
    >;

type ListenersMapToEventMap<T extends Record<string, AnyFunction[]>> = {
  [P in keyof T]: Parameters<T[P][number]>[0];
};

export type GetEventMap<T> = T extends Window
  ? WindowEventMap
  : T extends ServiceWorker
    ? ServiceWorkerEventMap
    : T extends Worker
      ? WorkerEventMap
      : T extends ShadowRoot
        ? ShadowRootEventMap
        : T extends Document
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
                      : T extends TextTrackList
                        ? TextTrackListEventMap
                        : T extends TextTrackCue
                          ? TextTrackCueEventMap
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
                                            : T extends RemotePlayback
                                              ? RemotePlaybackEventMap
                                              : T extends EventEmitter<any, any>
                                                ? ListenersMapToEventMap<
                                                    ReturnType<T['getEventListeners']>
                                                  >
                                                : EmptyObject;

export function isEventTargetLike(target: unknown): target is EventTargetLike {
  return (
    (target as EventTargetLike).addEventListener !== undefined &&
    (target as EventTargetLike).removeEventListener !== undefined
  );
}

export function isDomEventTarget(target: unknown): target is DomEventTarget {
  return isEventTargetLike(target) && (target as DomEventTarget).dispatchEvent !== undefined;
}

export function isEventEmitterLike(target: unknown): target is EventEmitterLike {
  return (
    !isEventTargetLike(target) &&
    !isDomEventTarget(target) &&
    (target as EventEmitterLike).on !== undefined &&
    (target as EventEmitterLike).once !== undefined &&
    (target as EventEmitterLike).off !== undefined
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
} catch {}

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
