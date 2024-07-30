import { getAwaiter, type Awaiter } from '@js-toolkit/utils/getAwaiter';
import { EventEmitterListener } from './EventEmitterListener';
import {
  type EmitterTarget,
  type GetEventType,
  isEventEmitterLike,
} from './EventEmitterListener.utils';

export type EventAwaiter = Awaiter<void>;

export function getEventAwaiter<
  T extends EmitterTarget,
  E extends GetEventType<T>,
  // M extends GetEventListener<T, E>
>(
  target: T,
  resolveEvent: E | E[],
  rejectEvent?: E | E[],
  /** If it returns null or undefined then reject is ignored. */
  eventToError?: (event: any) => unknown
): EventAwaiter {
  const readyAwaiter = getAwaiter({ lazy: true });
  const resolveEvents = Array.isArray(resolveEvent) ? resolveEvent : [resolveEvent];
  const rejectEvents = Array.isArray(rejectEvent) ? rejectEvent : [rejectEvent];
  const listener = isEventEmitterLike(target) ? target : new EventEmitterListener<any>(target);

  const resolve = (): void => {
    readyAwaiter.resolve();
  };

  const reject = (ev: unknown): void => {
    const err = eventToError ? eventToError(ev) : ev;
    err != null && readyAwaiter.reject(err);
  };

  const destroy = (): void => {
    resolveEvents.forEach((e) => listener.off(e, resolve));
    rejectEvents.forEach((e) => listener.off(e, reject));
  };

  const resolveOrigin = readyAwaiter.resolve;
  readyAwaiter.resolve = (...args) => {
    destroy();
    resolveOrigin(...args);
  };

  const rejectOrigin = readyAwaiter.reject;
  readyAwaiter.reject = (...args) => {
    rejectOrigin(...args);
    destroy();
  };

  // const waitOrigin = readyAwaiter.wait;
  // readyAwaiter.wait = (...args) => {
  //   if (driver.isReady) readyAwaiter.resolve();
  //   return waitOrigin(...args);
  // };

  resolveEvents.forEach((e) => listener.on(e, resolve));
  rejectEvents.forEach((e) => listener.on(e, reject));

  return readyAwaiter;
}
