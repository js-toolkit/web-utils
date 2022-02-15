import {
  GetEventMap,
  GetEventType as GetDomEventType,
  GetEventListener as GetDomEventListener,
  isPassiveSupported,
  normalizeOptions,
} from './EventTargetListener.utils';

// type DomEventTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
type DomEventTarget = EventTarget;

type EventEmitterTarget = {
  on: (type: any, listener: AnyFunction, ...rest: any[]) => void;
  once?: (type: any, listener: AnyFunction, ...rest: any[]) => void;
  off: (type: any, listener: AnyFunction, ...rest: any[]) => void;
};

export type EmitterTarget = DomEventTarget | EventEmitterTarget;

function isDomEventTarget(target: EmitterTarget): target is DomEventTarget {
  return (target as DomEventTarget).addEventListener !== undefined;
}

type GetEventType<T extends EmitterTarget> = T extends DomEventTarget
  ? GetDomEventType<T>
  : T extends EventEmitterTarget
  ? T['on'] extends { (type: infer K, listener: AnyFunction, ...rest: unknown[]): unknown }
    ? K
    : string
  : string;

type GetEventListener<T extends EmitterTarget, E, EM extends AnyObject> = T extends DomEventTarget
  ? GetDomEventListener<E, EM>
  : T extends EventEmitterTarget
  ? (
      ev: IfExtends<EM, EmptyObject, unknown, E extends keyof EM ? EM[E] : unknown>,
      ...rest: any[]
    ) => unknown
  : AnyFunction;

type GetOnOptions<T extends EmitterTarget> = T extends DomEventTarget
  ? boolean | AddEventListenerOptions
  : undefined;

type GetOnceOptions<T extends EmitterTarget> = T extends DomEventTarget
  ? boolean | OmitStrict<AddEventListenerOptions, 'once'>
  : undefined;

type GetOffOptions<T extends EmitterTarget> = T extends DomEventTarget
  ? boolean | EventListenerOptions
  : undefined;

type EventListenersMap = Partial<
  Record<string, Map<EventListenerOrEventListenerObject, AnyFunction>>
>;

// type ListenerWrapper = (ev: AnyObject, ...rest: unknown[]) => unknown;
type ListenerWrapper = (...args: unknown[]) => unknown;

export default class EventEmitterListener<
  T extends EmitterTarget,
  M extends AnyObject = GetEventMap<T>
> {
  private readonly normalListeners: EventListenersMap = {};

  private readonly captureListeners: EventListenersMap = {};

  readonly passiveSupported = isPassiveSupported();

  constructor(public readonly target: T) {
    this.target = target;
  }

  private createWrapper(
    type: string,
    listener: EventListenerObject | ListenerWrapper,
    options?: boolean | AddEventListenerOptions
  ): ListenerWrapper {
    return (...params) => {
      if (typeof options === 'object' && options.once) {
        this.off(type, listener, options as GetOffOptions<T>);
      }
      if (typeof listener === 'object') {
        (listener.handleEvent as ListenerWrapper)(...params);
      } else {
        listener(...params);
      }
    };
  }

  on<K extends GetEventType<T>>(
    type: K,
    listener: GetEventListener<T, K, M>,
    options?: GetOnOptions<T>
  ): this;

  on(type: string, listener: EventListenerOrEventListenerObject, options?: GetOnOptions<T>): this;

  on(type: string, listener: AnyFunction, options?: GetOnOptions<T>): this {
    if (!isDomEventTarget(this.target)) {
      const map =
        this.normalListeners[type] ?? new Map<EventListenerOrEventListenerObject, AnyFunction>();

      const handler = map.get(listener) ?? listener;
      !map.has(listener) && map.set(listener, handler);

      this.normalListeners[type] = map;
      this.target.on(type, handler);
      return this;
    }

    // DOM
    const useCapture =
      options === true || (typeof options === 'object' && (options.capture ?? false));

    if (useCapture) {
      const map =
        this.captureListeners[type] ?? new Map<EventListenerOrEventListenerObject, AnyFunction>();

      const wrapper = map.get(listener) ?? this.createWrapper(type, listener, options);
      !map.has(listener) && map.set(listener, wrapper);

      this.captureListeners[type] = map;
      this.target.addEventListener(type, wrapper, normalizeOptions(options));
    } else {
      const map =
        this.normalListeners[type] ?? new Map<EventListenerOrEventListenerObject, AnyFunction>();

      const wrapper = map.get(listener) ?? this.createWrapper(type, listener, options);
      !map.has(listener) && map.set(listener, wrapper);

      this.normalListeners[type] = map;
      this.target.addEventListener(type, wrapper, normalizeOptions(options));
    }

    return this;
  }

  once<K extends GetEventType<T>>(
    type: K,
    listener: GetEventListener<T, K, M>,
    options?: GetOnceOptions<T>
  ): this;

  once(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: GetOnceOptions<T>
  ): this;

  once(type: string, listener: AnyFunction, options?: GetOnceOptions<T>): this {
    if (!isDomEventTarget(this.target)) {
      const map =
        this.normalListeners[type] ?? new Map<EventListenerOrEventListenerObject, AnyFunction>();
      this.normalListeners[type] = map;

      if (this.target.once) {
        const wrapper = map.get(listener) ?? listener;
        !map.has(listener) && map.set(listener, wrapper);
        this.target.once(type, wrapper);
      } else {
        const wrapper = map.get(listener) ?? this.createWrapper(type, listener, { once: true });
        !map.has(listener) && map.set(listener, wrapper);
        this.target.on(type, wrapper);
      }

      return this;
    }

    // DOM
    return this.on(type, listener, {
      ...(typeof options === 'object' ? options : options != null && { capture: options }),
      once: true,
    } as GetOnOptions<DomEventTarget> as GetOnOptions<T>);
  }

  off<K extends GetEventType<T>>(
    type: K,
    listener: GetEventListener<T, K, M>,
    options?: GetOffOptions<T>
  ): this;

  off(type: string, listener: EventListenerOrEventListenerObject, options?: GetOffOptions<T>): this;

  off(type: string, listener: AnyFunction, options?: GetOffOptions<T>): this {
    if (!isDomEventTarget(this.target)) {
      const map = this.normalListeners[type];
      const wrapper = map?.get(listener);
      map && wrapper && map.delete(listener);
      if (map?.size === 0) {
        delete this.normalListeners[type];
      }

      this.target.off(type, wrapper ?? listener);

      return this;
    }

    // DOM
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
      captureMap &&
        captureMap.forEach((_, wrapper) => this.off(type, wrapper, true as GetOffOptions<T>));
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

// new EventEmitterListener({} as HTMLVideoElement).on('encrypted', (e) => e);
// new EventEmitterListener({} as HTMLVideoElement).removeAllListeners('sdff');
