/* eslint-disable no-cond-assign */
// https://github.com/mozilla/vtt.js/blob/master/lib/vtt.js

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
  const matchAr = input.match(/^([^<]*)(<[^>]+>?)?/);
  if (!matchAr) {
    return [input, undefined];
  }
  // If there is some text before the next tag, return it, otherwise return the tag.
  const token = matchAr[1] ? matchAr[1] : matchAr[2];
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

export interface ParseCueTextResult<P> {
  readonly segments: P[];
}

export function parseCueText<P = CueSegment>(
  input0: string,
  map?: (segment: CueSegment) => P
): ParseCueTextResult<P> {
  let current: HTMLElement | undefined;
  let input = input0;
  let token: string | undefined;
  let timeStamp = -1;
  const tagStack = [] as string[];
  const segments = [] as P[];

  const appendSegment = (id: string): void => {
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
      segments.push(map ? map(segment) : (segment as P));
      timeStamp = -1;
    }
  };

  while ((([input, token] = nextToken(input)), token) != null) {
    const id = String(segments.length + 1);
    // console.log('token', token);
    if (token[0] === '<') {
      // If the closing tag matches, move back up to the parent node.
      // Otherwise just ignore the end tag.
      if (token[1] === '/') {
        if (tagStack.at(-1) === token.substring(2).replace('>', '')) {
          appendSegment(id);
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
      // console.log(tagStack.at(-1), typeof token, token, current);
      if (current == null) {
        const node = createHtmlNode('c', '');
        if (node) {
          node.appendChild(window.document.createTextNode(unescape(token)));
          const segment: CueSegment = { id, node, tag: 'c', startTime: undefined };
          segments.push(map ? map(segment) : (segment as P));
        }
      }
      if (current) {
        current.appendChild(window.document.createTextNode(unescape(token)));
      }
    }
  }

  // console.log(segments);

  return { segments };
}
