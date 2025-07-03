/* eslint-disable no-cond-assign */
// https://github.com/mozilla/vtt.js/blob/master/lib/vtt.js

import { splitRows } from './TextTracksController/utils';

export interface CueSegment {
  readonly id: string;
  readonly startTime: number | undefined;
  readonly tag: keyof typeof TAG_NAME;
  readonly node: HTMLElement;
}

const ESCAPE: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&lrm;': '\u200e',
  '&rlm;': '\u200f',
  '&nbsp;': '\u00a0',
};

const TAG_NAME: Record<string, string> = {
  c: 'span',
  i: 'i',
  b: 'b',
  u: 'u',
  ruby: 'ruby',
  rt: 'rt',
  // v: 'span', ignore voice tag because it might be unclosed and it is unsupported by parser.
  lang: 'span',
};

const TAG_ANNOTATION: Record<string, ExtractStrict<keyof HTMLElement, 'title' | 'lang'>> = {
  v: 'title',
  lang: 'lang',
};

const NEEDS_PARENT: Record<string, string> = {
  rt: 'ruby',
};

function computeSeconds(h: string, m: string, s: string, f: string): number {
  return (+h || 0) * 3600 + (+m || 0) * 60 + (+s || 0) + (+f || 0) / 1000;
}

// Try to parse input as a time stamp.
function parseTimeStamp(input: string): number | undefined {
  const matchAr = input.match(/^(\d+):(\d{2})(:\d{2})?\.(\d{3})/);
  if (!matchAr) {
    return undefined;
  }
  const [, h, m, s, f] = matchAr;
  // Timestamp takes the form of [hours]:[minutes]:[seconds].[milliseconds]
  if (f) {
    return computeSeconds(h, m, s.replace(':', ''), f);
  }
  // Timestamp takes the form of [hours]:[minutes].[milliseconds]
  // First position is hours as it's over 59.
  if (+h > 59) {
    return computeSeconds(h, m, '', f);
  }
  // Timestamp takes the form of [minutes]:[seconds].[milliseconds]
  return computeSeconds('', h, m, f);
}

function unescape(str0: string): string {
  let str = str0;
  let matchAr;
  while ((matchAr = str.match(/&(amp|lt|gt|lrm|rlm|nbsp);/))) {
    // Unescape a string 's'.
    str = str.replace(matchAr[0], (s) => ESCAPE[s]);
  }
  return str;
}

function nextToken(input: string): [output: string, token: string | undefined] {
  // Check for end-of-string.
  if (!input) {
    return [input, undefined];
  }
  const matchAr = input.match(/^([^<]*)(<[^>]*>?)?/);
  if (!matchAr) {
    return [input, undefined];
  }
  // If there is some text before the next tag, return it, otherwise return the tag.
  const token = matchAr[1] ? matchAr[1] : matchAr[2];
  // If tag is invalid or it is not a tag. Eg: <>.
  if (token == null) {
    return [input, token];
  }
  // Consume 'n' characters from the input.
  return [input.substring(token.length), token];
}

function shouldAdd(current: Element, element: Element): boolean {
  return !NEEDS_PARENT[element.localName] || NEEDS_PARENT[element.localName] === current.localName;
}

// Create an element for this tag.
function createHtmlNode(type: string, annotation: string): HTMLElement | undefined {
  const tagName = TAG_NAME[type];
  if (!tagName) {
    return undefined;
  }
  const element = window.document.createElement(tagName);
  // element.localName = tagName;
  const name = TAG_ANNOTATION[type];
  if (name && annotation) {
    element[name] = annotation.trim();
  }
  return element;
}

export interface ParseCueTextOptions {
  /** Defaults to `0`. */
  readonly preferLineLength?: number | undefined;
}

export interface ParseCueTextResult<P> {
  readonly segments: P[][];
  readonly rawText: string[];
}

// https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format#cue_payload
export function parseCueText<P = CueSegment>(
  input0: string,
  map?: (segment: CueSegment, prevSegment: P | undefined) => P,
  { preferLineLength = 0 }: ParseCueTextOptions = {}
): ParseCueTextResult<P> {
  let current: HTMLElement | undefined;
  let prevCurrent: HTMLElement | undefined;
  let input = input0;
  let token: string | undefined;
  let timeStamp = -1;
  const tagStack = [] as string[];
  const segments = [] as P[][];
  const rawText = [] as string[];

  const addSegmentToRow = (segment: CueSegment): void => {
    if (segments.length === 0) segments.push([]);
    segments
      .at(-1)!
      .push(map ? map(segment, (segments.at(-1) ?? segments.at(-2))?.at(-1)) : (segment as P));
  };

  const addSegment = (id: string): void => {
    const tag = tagStack.pop() ?? '';
    const node = current!;
    current = node.parentElement || undefined;
    if (current == null) {
      const segment: CueSegment = {
        id,
        startTime: timeStamp >= 0 ? timeStamp : undefined,
        tag,
        node,
      };
      addSegmentToRow(segment);
      // All next nodes will be with the same timeStamp until the next timeStamp.
      // timeStamp = -1;
      prevCurrent = node;
    }
  };

  const getNextId = (): string => {
    return `${segments.length}-${(segments.at(-1)?.length ?? 0) + 1}`;
  };

  const addLeafToken = (text: string): void => {
    const node = createHtmlNode('c', '')!;
    node.appendChild(window.document.createTextNode(unescape(text)));
    const segment: CueSegment = {
      id: getNextId(),
      node,
      tag: 'c',
      startTime: timeStamp >= 0 ? timeStamp : undefined,
    };
    addSegmentToRow(segment);
  };

  const addTextNode = (text: string, newRow: boolean): void => {
    if (newRow) {
      rawText.push(text);
    } else {
      rawText[rawText.length - 1] += text;
    }
    if (newRow) segments.push([]);
    if (current == null) {
      // Append whitespaces to prev node.
      if (text.trim().length === 0 && !newRow && prevCurrent) {
        prevCurrent.appendChild(window.document.createTextNode(unescape(text)));
      } else {
        addLeafToken(text);
      }
    } else {
      current.appendChild(window.document.createTextNode(unescape(text)));
    }
  };

  while ((([input, token] = nextToken(input)), token) != null) {
    // console.log('token', token);
    if (token[0] === '<') {
      // If the closing tag matches, move back up to the parent node.
      // Otherwise just ignore the end tag.
      if (token[1] === '/') {
        if (tagStack.at(-1) === token.substring(2).replace('>', '')) {
          addSegment(getNextId());
        }
      } else {
        // Try to parse timestamp.
        // Timestamps are lead nodes as well.
        const ts = parseTimeStamp(token.substring(1, token.length - 1));
        if (ts) {
          timeStamp = ts;
        } else {
          const matchAr = token.match(/^<([^.\s/0-9>]+)(\.[^\s\\>]+)?([^>\\]+)?(\\?)>?$/);
          // If we can't parse the tag, skip to the next tag.
          // Try to construct an element, and ignore the tag if we couldn't.
          const node = matchAr && createHtmlNode(matchAr[1], matchAr[3]);
          // Determine if the tag should be added based on the context of where it
          // is placed in the cuetext.
          if (node && (!current || shouldAdd(current, node))) {
            // Set the class list (as a list of classes, separated by space).
            if (matchAr[2]) {
              node.className = matchAr[2].substring(1).replace('.', ' ');
            }
            // Append the node to the current node, and enter the scope of the new node.
            tagStack.push(matchAr[1]);
            current?.appendChild(node);
            current = node;
          }
        }
      }
    }
    // Text nodes are leaf nodes.
    else {
      // console.log(token, current, preferLength);
      // eslint-disable-next-line no-lonely-if
      if (
        rawText.length === 0 ||
        (preferLineLength > 0 && rawText.at(-1)!.length + token.length > preferLineLength)
      ) {
        const rows = splitRows(token, preferLineLength);
        const { length } = rows;
        for (let i = 0; i < length; i += 1) {
          addTextNode(rows[i], true);
        }
      } else {
        addTextNode(token, false);
      }
    }
  }

  // console.log(rawText);
  // console.log(segments);

  return { segments, rawText };
}
