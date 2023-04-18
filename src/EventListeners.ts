import { EventEmitterListener, type EmitterTarget } from './EventEmitterListener';
import type { GetEventMap } from './EventEmitterListener.utils';

export class EventListeners {
  private readonly listeners = new Map<EmitterTarget, EventEmitterListener<any, any>>();

  scope<T extends EmitterTarget, M extends AnyObject = GetEventMap<T>>(
    target: T
  ): EventEmitterListener<T, M> {
    const listener = this.listeners.get(target) ?? new EventEmitterListener<T, M>(target);
    !this.listeners.has(target) && this.listeners.set(target, listener);
    return listener as EventEmitterListener<T, M>;
  }

  removeAllListeners<T extends EmitterTarget>(target?: T | undefined): this {
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

export default EventListeners;
