import EventTargetListener from './EventTargetListener';
import { GetEventMap } from './EventTargetListener.utils';

export default class EventTargetListeners {
  private readonly listeners = new Map<EventTarget, EventTargetListener<any, any>>();

  scope<T extends EventTarget, M extends AnyObject = GetEventMap<T>>(
    target: T
  ): EventTargetListener<T, M> {
    const listener = this.listeners.get(target) ?? new EventTargetListener<T, M>(target);
    !this.listeners.has(target) && this.listeners.set(target, listener);
    return listener;
  }

  removeAllListeners<T extends EventTarget>(target?: T): this {
    if (target) {
      this.listeners.get(target)?.removeAllListeners();
      this.listeners.delete(target);
    } else {
      this.listeners.forEach((l) => l.removeAllListeners());
      this.listeners.clear();
    }
    return this;
  }
}
