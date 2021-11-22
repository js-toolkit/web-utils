/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import isEmptyObject from '@js-toolkit/utils/isEmptyObject';

export type MinimalEventTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

type GetEventType<T extends MinimalEventTarget> = T['addEventListener'] extends {
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

type EventListenersMap = Partial<
  Record<string, Map<EventListenerOrEventListenerObject, EventListener>>
>;

type ListenerWrapper = (ev: AnyObject, ...rest: any[]) => any;

let passiveSupported = false;

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

function normalizeOptions(options: boolean | AddEventListenerOptions | undefined): typeof options {
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

export default class EventTargetListener<
  T extends MinimalEventTarget,
  M extends Record<string, any> = ElementEventMap
> {
  private readonly normalListeners: EventListenersMap = {};

  private readonly captureListeners: EventListenersMap = {};

  readonly passiveSupported = passiveSupported;

  constructor(public readonly target: T) {
    this.target = target;
  }

  private createWrapper(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): ListenerWrapper {
    return (ev, ...rest) => {
      if (typeof options === 'object' && options.once) {
        this.off(type, listener, options);
      }
      if (typeof listener === 'object') {
        (listener.handleEvent as ListenerWrapper)(ev, ...rest);
      } else {
        (listener as ListenerWrapper)(ev, ...rest);
      }
    };
  }

  on<K extends GetEventType<T>, E extends AnyObject = Event>(
    type: K,
    listener: (this: T, ev: K extends keyof M ? M[K] : E, ...rest: any[]) => any,
    options?: boolean | AddEventListenerOptions
  ): this;

  on(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): this;

  on(type: string, listener: any, options?: boolean | AddEventListenerOptions): this {
    const useCapture =
      options === true || (typeof options === 'object' && (options.capture ?? false));

    if (useCapture) {
      const map =
        this.captureListeners[type] ?? new Map<EventListenerOrEventListenerObject, EventListener>();

      const wrapper = map.get(listener) ?? this.createWrapper(type, listener, options);
      !map.has(listener) && map.set(listener, wrapper);

      this.captureListeners[type] = map;
      this.target.addEventListener(type, wrapper, normalizeOptions(options));
    } else {
      const map =
        this.normalListeners[type] ?? new Map<EventListenerOrEventListenerObject, EventListener>();

      const wrapper = map.get(listener) ?? this.createWrapper(type, listener, options);
      !map.has(listener) && map.set(listener, wrapper);

      this.normalListeners[type] = map;
      this.target.addEventListener(type, wrapper, normalizeOptions(options));
    }

    return this;
  }

  once<K extends GetEventType<T>, E extends AnyObject = Event>(
    type: K,
    listener: (this: T, ev: K extends keyof M ? M[K] : E, ...rest: any[]) => any,
    options?: boolean | Omit<AddEventListenerOptions, 'once'>
  ): this;

  once(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | Omit<AddEventListenerOptions, 'once'>
  ): this;

  once(
    type: string,
    listener: any,
    options?: boolean | Omit<AddEventListenerOptions, 'once'>
  ): this {
    return this.on(type, listener, {
      ...(typeof options === 'object' ? options : options != null && { capture: options }),
      once: true,
    });
  }

  off<K extends GetEventType<T>, E extends AnyObject = Event>(
    type: K,
    listener: (this: T, ev: K extends keyof M ? M[K] : E, ...rest: any[]) => any,
    options?: boolean | EventListenerOptions
  ): this;

  off(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): this;

  off(type: string, listener: any, options?: boolean | EventListenerOptions): this {
    const useCapture =
      options === true || (typeof options === 'object' && (options.capture ?? false));

    const map = useCapture ? this.captureListeners[type] : this.normalListeners[type];
    const wrapper = map?.get(listener);
    map && wrapper && map.delete(listener);
    if (map?.size === 0) {
      if (useCapture) delete this.captureListeners[type];
      else delete this.normalListeners[type];
    }
    this.target.removeEventListener(type, wrapper ?? listener, normalizeOptions(options));

    return this;
  }

  removeAllListeners<K extends GetEventType<T>>(type?: K): this;

  removeAllListeners(type?: string): this;

  removeAllListeners(type?: string): this {
    if (type) {
      const normalMap = this.normalListeners[type];
      normalMap && normalMap.forEach((_, wrapper) => this.off(type, wrapper));
      const captureMap = this.captureListeners[type];
      captureMap && captureMap.forEach((_, wrapper) => this.off(type, wrapper, true));
    } else {
      Object.keys(this.normalListeners).forEach((k) => this.removeAllListeners(k));
      Object.keys(this.captureListeners).forEach((k) => this.removeAllListeners(k));
    }
    return this;
  }

  removeAllListenersBut<K extends GetEventType<T>>(...types: K[]): this;

  removeAllListenersBut(...types: string[]): this;

  removeAllListenersBut(...types: string[]): this {
    if (types.length === 0) return this.removeAllListeners();

    Object.keys(this.normalListeners).forEach(
      (k) => !types.includes(k) && this.removeAllListeners(k)
    );
    Object.keys(this.captureListeners).forEach(
      (k) => !types.includes(k) && this.removeAllListeners(k)
    );

    return this;
  }
}

// new EventTargetListener<HTMLVideoElement, HTMLMediaElementEventMap>({} as HTMLVideoElement).on(
//   'click',
//   (e) => e
// );
// new EventTargetListener({} as HTMLVideoElement).removeAllListeners('sdff');

// type GetEventListenerEventTypes<T extends Element> = T['addEventListener'] extends {
//   (
//     type: any,
//     listener: (this: T, ev: infer E) => any,
//     options?: boolean | AddEventListenerOptions
//   ): void;
//   (
//     type: string,
//     listener: EventListenerOrEventListenerObject,
//     options?: boolean | AddEventListenerOptions
//   ): void;
// }
//   ? E
//   : Event;

// type A = GetEventType<HTMLVideoElement>;
// type B = GetEventListenerEventTypes<HTMLVideoElement>;
