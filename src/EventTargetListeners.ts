import EventTargetListener, { MinimalEventTarget } from './EventTargetListener';

export default class EventTargetListeners {
  private readonly listeners = new Map<MinimalEventTarget, EventTargetListener<any, any>>();

  scope<T extends MinimalEventTarget, M extends Record<string, any> = ElementEventMap>(
    target: T
  ): EventTargetListener<T, M> {
    const listener = this.listeners.get(target) ?? new EventTargetListener<T, M>(target);
    !this.listeners.has(target) && this.listeners.set(target, listener);
    return listener as EventTargetListener<T, M>;
  }

  removeAllListeners<T extends MinimalEventTarget>(target?: T): this {
    if (target) {
      // eslint-disable-next-line no-unused-expressions
      this.listeners.get(target)?.removeAllListeners();
      this.listeners.delete(target);
    } else {
      this.listeners.forEach((l) => l.removeAllListeners());
      this.listeners.clear();
    }
    return this;
  }
}
