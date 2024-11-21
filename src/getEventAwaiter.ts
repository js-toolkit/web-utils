/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAwaiter, type Awaiter } from '@js-toolkit/utils/getAwaiter';
import { EventEmitterListener } from './EventEmitterListener';
import {
  type EmitterTarget,
  type EventTargetLike,
  type GetEventType,
  type GetEventTypeFromFn,
  isEventEmitterLike,
} from './EventEmitterListener.utils';

export type EventAwaiter = Awaiter<void>;

interface Options {
  /** If it returns true then resolve is ignored. */
  readonly ignoreResolve?: (event: any) => boolean;
  /** If it returns null or undefined then reject is ignored. */
  readonly eventToError?: (event: any) => unknown;
}

export function getEventAwaiter<
  T extends EmitterTarget,
  E extends T extends EventTargetLike
    ? GetEventTypeFromFn<OverloadToUnion<T['addEventListener']>>
    : GetEventType<T>,
>(
  target: T,
  resolveEvent: E | E[],
  rejectEvent?: E | E[],
  { ignoreResolve, eventToError }: Options = {}
): EventAwaiter {
  const readyAwaiter = getAwaiter({ lazy: true });
  const resolveEvents = Array.isArray(resolveEvent) ? resolveEvent : [resolveEvent];
  const rejectEvents = Array.isArray(rejectEvent) ? rejectEvent : [rejectEvent];
  const listener = isEventEmitterLike(target) ? target : new EventEmitterListener<any>(target);

  const resolve = (ev: unknown): void => {
    const ignore = ignoreResolve ? ignoreResolve(ev) : false;
    !ignore && readyAwaiter.resolve();
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
