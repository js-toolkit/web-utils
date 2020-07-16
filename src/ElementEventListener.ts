/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
type GetEventType<T extends Element> = T['addEventListener'] extends {
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

export default class ElementEventListener<
  T extends Element,
  M extends ElementEventMap = ElementEventMap
> {
  private readonly target: T;

  private readonly listeners: Partial<Record<string, Set<EventListenerOrEventListenerObject>>> = {};

  private readonly captureListeners: Partial<
    Record<string, Set<EventListenerOrEventListenerObject>>
  > = {};

  constructor(target: T) {
    this.target = target;
  }

  on<K extends GetEventType<T>, E extends Event = Event>(
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
    this.target.addEventListener(type, listener, options);

    const useCapture =
      options === true || (typeof options === 'object' && (options.capture ?? false));

    if (useCapture) {
      const list = this.captureListeners[type] ?? new Set();
      list.add(listener);
      this.captureListeners[type] = list;
    } else {
      const list = this.listeners[type] ?? new Set();
      list.add(listener);
      this.listeners[type] = list;
    }

    return this;
  }

  once<K extends GetEventType<T>, E extends Event = Event>(
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
      ...(typeof options === 'object' ? options : { capture: options === true }),
      once: true,
    });
  }

  off<K extends GetEventType<T>, E extends Event = Event>(
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
    this.target.removeEventListener(type, listener, options);

    const useCapture =
      options === true || (typeof options === 'object' && (options.capture ?? false));

    if (useCapture) {
      const list = this.captureListeners[type];
      list && list.delete(listener);
    } else {
      const list = this.listeners[type];
      list && list.delete(listener);
    }

    return this;
  }

  removeAllListeners<K extends GetEventType<T>>(type?: K): this;

  removeAllListeners(type?: string): this;

  removeAllListeners(type?: string): this {
    if (type) {
      const normalList = this.listeners[type];
      normalList && normalList.forEach((l) => this.off(type, l));

      const captureList = this.captureListeners[type];
      captureList && captureList.forEach((l) => this.off(type, l, true));
    } else {
      Object.keys(this.listeners).forEach((k) => this.removeAllListeners(k));
      Object.keys(this.captureListeners).forEach((k) => this.removeAllListeners(k));
    }

    return this;
  }
}

// new ElementEventListener<HTMLVideoElement, HTMLMediaElementEventMap>({} as HTMLVideoElement).on(
//   'click',
//   (e) => e
// );
// new ElementEventListener({} as HTMLVideoElement).removeAllListeners('sdff');

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
