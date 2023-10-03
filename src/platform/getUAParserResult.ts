import { UAParser } from 'ua-parser-js';

let result: UAParser.IResult;

export function getUAParserResult(): DeepReadonly<UAParser.IResult> {
  if (result == null) {
    const parser = new UAParser(navigator.userAgent);
    result = parser.getResult();
  }
  return result;
}
