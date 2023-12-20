import { UAParser } from 'ua-parser-js';

type UAInfo = DeepReadonly<OmitStrict<UAParser.IResult, 'withClientHints' | 'withFeatureCheck'>> & {
  toStringObject(): Record<Keys<ExcludeKeysOfType<UAParser.IResult, AnyFunction>>, string>;
};

let result: UAInfo | undefined;
let promise: Promise<UAParser.IResult> | undefined;

export async function getUAInfo(): Promise<UAInfo> {
  if (result == null) {
    promise =
      promise ??
      Promise.resolve(
        // Is that order calls overrides values (withFeatureCheck().withClientHints()) ?
        new UAParser(navigator.userAgent).getResult().withFeatureCheck().withClientHints()
      );
    result = {
      ...(await promise),
      toStringObject(this: UAInfo) {
        return Object.getOwnPropertyNames(this).reduce(
          (acc, key) => {
            const prop = key as keyof typeof this;
            if (this[prop] != null && typeof this[prop] !== 'function') {
              acc[prop] = this[prop].toString();
            }
            return acc;
          },
          {} as Record<keyof UAInfo, string>
        );
      },
    };
    promise = undefined;
  }
  return result;
}

export function getCachedUAInfo(): UAInfo | undefined {
  if (result == null) {
    console.warn('UAInfo is not ready yet.');
    void getUAInfo();
  }
  return result;
}
