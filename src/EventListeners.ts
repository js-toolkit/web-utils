import { EventEmitterListener } from './EventEmitterListener';
import type { EmitterTarget, GetEventMap } from './EventEmitterListener.utils';

export class EventListeners {
  // private readonly listeners = new Map<EmitterTarget, EventEmitterListener<any, any>>();

  // scope<T extends EmitterTarget, M extends AnyObject = GetEventMap<T>>(
  //   target: T
  // ): EventEmitterListener<T, M> {
  //   const listener = this.listeners.get(target) ?? new EventEmitterListener<T, M>(target);
  //   !this.listeners.has(target) && this.listeners.set(target, listener);
  //   return listener as EventEmitterListener<T, M>;
  // }

  // removeAllListeners<T extends EmitterTarget>(target?: T | undefined): this {
  //   if (target) {
  //     this.listeners.get(target)?.removeAllListeners();
  //     this.listeners.delete(target);
  //   } else {
  //     this.listeners.forEach((l) => l.removeAllListeners());
  //     this.listeners.clear();
  //   }
  //   return this;
  // }

  private readonly listeners = new Map<
    EmitterTarget,
    Map<string, EventEmitterListener<any, any>>
  >();

  getScopes(): IterableIterator<EmitterTarget> {
    return this.listeners.keys();
  }

  scope<T extends EmitterTarget, M extends AnyObject = GetEventMap<T>>(
    target: T,
    scope?: string
  ): EventEmitterListener<T, M> {
    const id = scope ?? '';
    const scopeMap = this.listeners.get(target) ?? new Map<string, EventEmitterListener<T, M>>();
    !this.listeners.has(target) && this.listeners.set(target, scopeMap);
    const listener = scopeMap.get(id) ?? new EventEmitterListener<T, M>(target);
    !scopeMap.has(id) && scopeMap.set(id, listener);
    return listener as EventEmitterListener<T, M>;
  }

  removeAllListeners<T extends EmitterTarget>(target?: T, scope?: string): this {
    if (target) {
      if (scope) {
        const map = this.listeners.get(target);
        map?.get(scope)?.removeAllListeners();
        map?.delete(scope);
        map?.size === 0 && this.listeners.delete(target);
      } else {
        const map = this.listeners.get(target);
        map?.forEach((l) => l.removeAllListeners());
        map?.clear();
        this.listeners.delete(target);
      }
    } else {
      this.listeners.forEach((m) => {
        m.forEach((l) => l.removeAllListeners());
        m.clear();
      });
      this.listeners.clear();
    }
    return this;
  }
}
