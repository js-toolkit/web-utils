import { UAParser } from 'ua-parser-js';

type UAInfo = DeepReadonly<OmitStrict<UAParser.IResult, 'withClientHints' | 'withFeatureCheck'>>;

let result: UAInfo | undefined;
let promise: Promise<UAParser.IResult> | undefined;

export async function getUAInfo(): Promise<UAInfo> {
  if (result == null) {
    promise =
      promise ??
      Promise.resolve(new UAParser(navigator.userAgent).getResult().withClientHints()).then((res) =>
        res.withFeatureCheck()
      );
    result = await promise;
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
