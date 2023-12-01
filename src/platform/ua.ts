import { UAParser } from 'ua-parser-js';

type UAInfo = DeepReadonly<OmitStrict<UAParser.IResult, 'withClientHints'>>;

let result: UAInfo | undefined;
let promise: Promise<UAInfo> | undefined;

export async function getUAInfo(): Promise<UAInfo> {
  if (result == null) {
    promise =
      promise ?? Promise.resolve(new UAParser(navigator.userAgent).getResult().withClientHints());
    result = await promise;
    promise = undefined;
  }
  return result;
}

export function getCachedUAInfo(): UAInfo | undefined {
  return result;
}
