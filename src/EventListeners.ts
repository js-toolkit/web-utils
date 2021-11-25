import EventEmitterListener, { EmitterTarget } from './EventEmitterListener';
import { GetEventMap } from './EventTargetListener.utils';

export default class EventListeners {
  private readonly listeners = new Map<EmitterTarget, EventEmitterListener<any, any>>();

  scope<T extends EmitterTarget, M extends AnyObject = GetEventMap<T>>(
    target: T
  ): EventEmitterListener<T, M> {
    const listener = this.listeners.get(target) ?? new EventEmitterListener<T, M>(target);
    !this.listeners.has(target) && this.listeners.set(target, listener);
    return listener;
  }

  removeAllListeners<T extends EmitterTarget>(target?: T): this {
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
