/// <reference types="ua-parser-js" preserve="true" />

import { UAParser } from 'ua-parser-js';

export type PlatformInfo = DeepReadonly<DeepExcludeKeysOfType<UAParser.IResult, AnyFunction>> & {
  toStringObject(): Record<Keys<ExcludeKeysOfType<UAParser.IResult, AnyFunction>>, string>;
};

let syncResult: PlatformInfo | undefined;
let asyncResult: PlatformInfo | undefined;
let promise: Promise<UAParser.IResult> | undefined;

function toPlatformInfo(result: UAParser.IResult): PlatformInfo {
  return {
    // Is that order calls overrides values (withFeatureCheck().withClientHints()) ?
    ...result,
    toStringObject(this: PlatformInfo) {
      return Object.getOwnPropertyNames(this).reduce(
        (acc, key) => {
          const prop = key as keyof typeof this;
          if (this[prop] != null && typeof this[prop] !== 'function') {
            acc[prop] = this[prop].toString();
          }
          return acc;
        },
        {} as Record<keyof PlatformInfo, string>
      );
    },
  };
}

export function getPlatformInfoSync(): PlatformInfo {
  if (asyncResult == null && syncResult == null) {
    // Is that order calls overrides values (withFeatureCheck().withClientHints()) ?
    syncResult = toPlatformInfo(
      new UAParser(navigator.userAgent).getResult().withFeatureCheck() as UAParser.IResult
    );
  }
  return (asyncResult ?? syncResult) as PlatformInfo;
}

export async function getPlatformInfo(): Promise<PlatformInfo> {
  if (asyncResult == null) {
    promise =
      promise ??
      Promise.resolve(
        // Is that order calls overrides values (withFeatureCheck().withClientHints()) ?
        (
          new UAParser(navigator.userAgent).getResult().withFeatureCheck() as UAParser.IResult
        ).withClientHints()
      );
    asyncResult = toPlatformInfo(await promise);
    syncResult = asyncResult;
    promise = undefined;
  }
  return asyncResult;
}

export function getCachedPlatformInfo(): PlatformInfo | undefined {
  if (asyncResult == null) {
    console.warn('PlatformInfo is not ready yet.');
    void getPlatformInfo();
  }
  return asyncResult;
}
