import EventTargetListener from './EventTargetListener';

export default class EventTargetListeners {
  private readonly listeners = new Map<EventTarget, EventTargetListener<any, any>>();

  scope<T extends EventTarget, M extends ElementEventMap = ElementEventMap>(
    target: T
  ): EventTargetListener<T, M> {
    const listener = this.listeners.get(target) ?? new EventTargetListener<T, M>(target);
    !this.listeners.has(target) && this.listeners.set(target, listener);
    return listener;
  }

  removeAllListeners(): this {
    this.listeners.forEach((l) => l.removeAllListeners());
    return this;
  }
}
