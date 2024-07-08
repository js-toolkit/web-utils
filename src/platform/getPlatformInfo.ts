/// <reference types="ua-parser-js" preserve="true" />

import { UAParser } from 'ua-parser-js';

type PlatformInfo = DeepReadonly<
  OmitStrict<UAParser.IResult, 'withClientHints' | 'withFeatureCheck'>
> & {
  toStringObject(): Record<Keys<ExcludeKeysOfType<UAParser.IResult, AnyFunction>>, string>;
};

let result: PlatformInfo | undefined;
let promise: Promise<UAParser.IResult> | undefined;

export async function getPlatformInfo(): Promise<PlatformInfo> {
  if (result == null) {
    promise =
      promise ??
      Promise.resolve(
        // Is that order calls overrides values (withFeatureCheck().withClientHints()) ?
        new UAParser(navigator.userAgent).getResult().withFeatureCheck().withClientHints()
      );
    result = {
      ...(await promise),
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
    promise = undefined;
  }
  return result;
}

export function getCachedPlatformInfo(): PlatformInfo | undefined {
  if (result == null) {
    console.warn('PlatformInfo is not ready yet.');
    void getPlatformInfo();
  }
  return result;
}
