/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type DomEventTarget,
  type GetEventMap as GetDomEventMap,
  type GetEventType as GetDomEventType,
  type GetEventListener as GetDomEventListener,
  isPassiveSupported,
  normalizeOptions,
} from './EventEmitterListener.utils';

type EventEmitterTarget = {
  on: (type: any, listener: AnyFunction, ...rest: any[]) => void;
  once?: ((type: any, listener: AnyFunction, ...rest: any[]) => void) | undefined;
  off: (type: any, listener: AnyFunction, ...rest: any[]) => void;
};

type EventTargetLike = {
  addEventListener: EventEmitterTarget['on'];
  removeEventListener: EventEmitterTarget['off'];
};

export type EmitterTarget = DomEventTarget | EventTargetLike | EventEmitterTarget;

function isDomEventTarget(target: EmitterTarget): target is DomEventTarget {
  return (
    (target as DomEventTarget).addEventListener !== undefined &&
    (target as DomEventTarget).removeEventListener !== undefined &&
    (target as DomEventTarget).dispatchEvent !== undefined
  );
}

function isEventTargetLike(target: EmitterTarget): target is EventTargetLike {
  return (
    (target as EventTargetLike).addEventListener !== undefined &&
    (target as EventTargetLike).removeEventListener !== undefined
  );
}

type GetEventType<T extends EmitterTarget> = T extends DomEventTarget
  ? GetDomEventType<T>
  : T extends EventEmitterTarget
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

type GetEventListener<T extends EmitterTarget, E, EM extends AnyObject> = T extends DomEventTarget
  ? IfExtends<EM, EmptyObject, EventListener, GetDomEventListener<E, EM>>
  : IfExtends<
      EM,
      EmptyObject,
      Parameters<
        T extends EventTargetLike
          ? T['addEventListener']
          : T extends EventEmitterTarget
          ? T['on']
          : AnyFunction
      >['1'],
      (event: E extends keyof EM ? EM[E] : unknown, ...rest: any[]) => unknown
    >;

type GetOnOptions<T extends EmitterTarget> = T extends DomEventTarget
  ? boolean | AddEventListenerOptions
  : unknown;

type GetOnceOptions<T extends EmitterTarget> = T extends DomEventTarget
  ? boolean | OmitStrict<AddEventListenerOptions, 'once'>
  : undefined;

type GetOffOptions<T extends EmitterTarget> = T extends DomEventTarget
  ? boolean | EventListenerOptions
  : undefined;

// type GetOnParameters<
//   T extends EmitterTarget,
//   E extends GetEventType<T> | string,
//   EM extends AnyObject
// > = [
//   type: GetEventType<T>,
//   listener: GetEventListener<T, E, EM>,
//   ...optionsOrParam: T extends DomEventTarget ? [options?: GetOnOptions<T> | undefined] : [],
//   ...rest: unknown[]
// ];

type GetOnceParameters<
  T extends EmitterTarget,
  E extends GetEventType<T> | string,
  EM extends AnyObject
> = [
  type: GetEventType<T>,
  listener: GetEventListener<T, E, EM>,
  ...optionsOrParam: T extends DomEventTarget ? [options?: GetOnceOptions<T> | undefined] : [],
  ...rest: unknown[]
];

type GetOffParameters<
  T extends EmitterTarget,
  E extends GetEventType<T> | string,
  EM extends AnyObject
> = [
  type: GetEventType<T>,
  listener: GetEventListener<T, E, EM>,
  ...optionsOrParam: T extends DomEventTarget ? [options?: GetOffOptions<T> | undefined] : [],
  ...rest: unknown[]
];

type ListenersMap = Map<AnyFunction, AnyFunction>;

type EventListenersMap = Partial<Record<string, ListenersMap>>;

type ListenerWrapper = (...args: unknown[]) => unknown;

interface GetListenersOptions {
  event?: string | undefined;
  type?: 'normal' | 'capture' | undefined;
}

export class EventEmitterListener<
  T extends EmitterTarget,
  M extends AnyObject = GetDomEventMap<T>
> {
  private readonly normalListeners: EventListenersMap = {};

  private readonly captureListeners: EventListenersMap = {};

  readonly passiveSupported = isPassiveSupported();

  constructor(public readonly target: T) {
    this.target = target;
  }

  private createWrapper(
    type: string,
    listener: GetEventListener<T, string, M>,
    once: boolean,
    ...rest: unknown[]
  ): ListenerWrapper {
    return (...params) => {
      if (once) {
        this.off(...([type, listener, ...rest] as GetOffParameters<T, string, M>));
      }
      // if (typeof listener === 'object') {
      //   (listener.handleEvent as ListenerWrapper)(...params);
      // } else {
      (listener as ListenerWrapper)(...params);
      // }
    };
  }

  getListenerList<L = unknown>({ event, type }: GetListenersOptions = {}): L[] {
    const map =
      (type === 'normal' && this.normalListeners) ||
      (type === 'capture' && this.captureListeners) ||
      undefined;
    if (map) {
      const entries = event ? map[event] && { [event]: map[event] } : map;
      if (!entries) return [];
      return Object.values(entries).flatMap(
        (m) => (m ? Array.from(m.keys()) : []) as unknown as L[]
      );
    }
    return this.getListenerList<L>({ event, type: 'normal' }).concat(
      this.getListenerList<L>({ event, type: 'capture' })
    );
  }

  getListeners<L = unknown>({ event, type }: GetListenersOptions = {}): Record<string, L[]> {
    const map =
      (type === 'normal' && this.normalListeners) ||
      (type === 'capture' && this.captureListeners) ||
      undefined;

    if (!map) {
      const normal = this.getListeners<L>({ event, type: 'normal' });
      const capture = this.getListeners<L>({ event, type: 'capture' });
      const acc: Record<string, L[]> = {};
      const callback = ([type, l]: [string, L[]]): void => {
        const list = acc[type];
        acc[type] = list ? list.concat(l) : l;
      };
      Object.entries(normal).forEach(callback);
      Object.entries(capture).forEach(callback);
      return acc;
    }

    const entries = event ? map[event] && { [event]: map[event] } : map;
    if (!entries) return {};
    return Object.entries(entries).reduce((acc, [type, m]) => {
      const listeners = m ? Array.from(m.keys()) : [];
      if (listeners.length > 0) acc[type] = listeners;
      return acc;
    }, {} as AnyObject);
  }

  has<K extends GetEventType<T>>(
    type: K,
    listener: GetEventListener<T, K, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOffOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): boolean;

  has(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOffOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): boolean;

  has(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOffOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): boolean {
    if (!isDomEventTarget(this.target)) {
      return !!this.normalListeners[type]?.has(listener);
    }
    // DOM
    const options = rest[0] as boolean | EventListenerOptions | undefined;
    const useCapture =
      options === true || (options && typeof options === 'object' && (options.capture ?? false));
    const map = useCapture ? this.captureListeners[type] : this.normalListeners[type];
    return !!map?.has(listener);
  }

  on<K extends GetEventType<T>>(
    type: K,
    listener: GetEventListener<T, K, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOnOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this;

  on(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOnOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this;

  on(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOnOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this {
    if (!isDomEventTarget(this.target)) {
      const map = this.normalListeners[type] ?? (new Map() as ListenersMap);
      this.normalListeners[type] = map;

      const handler = map.get(listener) ?? listener;
      !map.has(listener) && map.set(listener, handler);

      if (isEventTargetLike(this.target)) {
        this.target.addEventListener(type, handler, ...rest);
      } else {
        this.target.on(type, handler, ...rest);
      }
      return this;
    }

    // DOM
    const options = rest[0] as boolean | AddEventListenerOptions | undefined;
    const useCapture =
      options === true || (options && typeof options === 'object' && (options.capture ?? false));
    const once = (options && typeof options === 'object' && options.once) ?? false;

    if (useCapture) {
      const map = this.captureListeners[type] ?? (new Map() as ListenersMap);
      this.captureListeners[type] = map;

      const wrapper = map.get(listener) ?? this.createWrapper(type, listener, once, options);
      !map.has(listener) && map.set(listener, wrapper);

      this.target.addEventListener(type, wrapper, normalizeOptions(options));
    } else {
      const map = this.normalListeners[type] ?? (new Map() as ListenersMap);
      this.normalListeners[type] = map;

      const wrapper = map.get(listener) ?? this.createWrapper(type, listener, once, options);
      !map.has(listener) && map.set(listener, wrapper);

      this.target.addEventListener(type, wrapper, normalizeOptions(options));
    }

    return this;
  }

  once<K extends GetEventType<T>>(
    type: K,
    listener: GetEventListener<T, K, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOnceOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this;

  once(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOnceOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this;

  once(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOnceOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this {
    if (!isDomEventTarget(this.target)) {
      const map = this.normalListeners[type] ?? (new Map() as ListenersMap);
      this.normalListeners[type] = map;

      const wrapper = map.get(listener) ?? this.createWrapper(type, listener, true, ...rest);
      !map.has(listener) && map.set(listener, wrapper);

      if (isEventTargetLike(this.target)) {
        this.target.addEventListener(type, wrapper, ...rest);
      } else if (this.target.once) {
        this.target.once(type, wrapper, ...rest);
      } else {
        this.target.on(type, wrapper, ...rest);
      }

      return this;
    }

    // DOM
    const options = rest[0] as boolean | AddEventListenerOptions | undefined;
    return this.on(
      ...([
        type,
        listener,
        {
          ...(typeof options === 'object' ? options : options != null && { capture: options }),
          once: true,
        },
      ] as unknown as GetOnceParameters<T, string, M>)
    );
  }

  off<K extends GetEventType<T>>(
    type: K,
    listener: GetEventListener<T, K, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOffOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this;

  off(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOffOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this;

  off(
    type: string,
    listener: GetEventListener<T, string, M>,
    ...rest: [
      ...(T extends DomEventTarget ? [options?: GetOffOptions<T> | undefined] : []),
      ...unknown[]
    ]
  ): this {
    if (!isDomEventTarget(this.target)) {
      const map = this.normalListeners[type];
      const wrapper = map?.get(listener);
      map && wrapper && map.delete(listener);
      if (map?.size === 0) {
        delete this.normalListeners[type];
      }

      if (isEventTargetLike(this.target)) {
        this.target.removeEventListener(type, wrapper ?? listener, ...rest);
      } else {
        this.target.off(type, wrapper ?? listener, ...rest);
      }

      return this;
    }

    // DOM
    const options = rest[0] as boolean | EventListenerOptions | undefined;
    const useCapture =
      options === true || (options && typeof options === 'object' && (options.capture ?? false));

    const map = useCapture ? this.captureListeners[type] : this.normalListeners[type];
    const wrapper = map?.get(listener);
    map && wrapper && map.delete(listener);
    if (map?.size === 0) {
      if (useCapture) delete this.captureListeners[type];
      else delete this.normalListeners[type];
    }
    this.target.removeEventListener(
      type,
      wrapper ?? (listener as EventListener),
      normalizeOptions(options)
    );

    return this;
  }

  removeAllListeners<K extends GetEventType<T>>(type?: K | undefined): this;

  removeAllListeners(type?: string | undefined): this;

  removeAllListeners(type?: string | undefined): this {
    if (type) {
      const normalMap = this.normalListeners[type];
      normalMap &&
        normalMap.forEach((_, listener) =>
          this.off(...([type, listener] as unknown as GetOffParameters<T, string, M>))
        );
      const captureMap = this.captureListeners[type];
      captureMap &&
        captureMap.forEach((_, listener) =>
          this.off(...([type, listener, true] as unknown as GetOffParameters<T, string, M>))
        );
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

export default EventEmitterListener;

// new EventEmitterListener({} as HTMLVideoElement).on('encrypted0', (e) => e, {});
// new EventEmitterListener({} as HTMLVideoElement).removeAllListeners('sdff');
// new EventEmitterListener({} as EventEmitterTarget).on('encrypted', (e) => e, {});
