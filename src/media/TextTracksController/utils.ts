import type {} from '../../FullscreenController';
import { isIOS } from '../../platform/isIOS';

declare global {
  interface TextTrack {
    customGroupId?: string | undefined;
  }
}

export type TextTrackItem = Readonly<
  OptionalToUndefined<
    PartialSome<
      RequiredStrict<
        Pick<HTMLTrackElement, 'src'> & Pick<TextTrack, 'kind' | 'label' | 'language'>
      >,
      'kind'
    >
  >
>;

export interface TextTrackInfo
  extends Pick<TextTrackItem, 'kind' | 'language' | 'label'>,
    Pick<TextTrack, 'id'> {}

export type ActivateTextTrackInfo = OptionalToUndefined<
  PartialBut<Pick<TextTrackInfo, 'kind' | 'language'>, 'language'>
>;

const DETACHED_GROUP_ID = '__detached__';

/** Hack: MSE can't remove texttracks on detaching because of no browser api for that. */
export function fakeDetachTextTracks(media: HTMLMediaElement): void {
  (Array.prototype as TextTrack[]).forEach.call(media.textTracks, (textTrack) => {
    const track = textTrack;
    if (track.customGroupId) {
      track.customGroupId = DETACHED_GROUP_ID;
    }
  });
}

export function parseTextTracks(media: HTMLMediaElement): TextTrackInfo[] {
  if (media.textTracks.length === 0) return [];
  return ((Array.prototype as TextTrack[]).reduce<TextTrackInfo[]>).call(
    media.textTracks,
    (acc, { customGroupId, id, kind, language, label }) => {
      if (customGroupId !== DETACHED_GROUP_ID && language) {
        acc.push({ id, kind, language, label: label ?? '' });
      }
      return acc;
    },
    []
  );
}

export function isIOSFullscreen(media: HTMLMediaElement): boolean {
  return isIOS() && !!media.webkitDisplayingFullscreen;
}

export function findTextTrack(
  media: Pick<HTMLMediaElement, 'textTracks'>,
  conditions: OptionalToUndefined<Partial<Pick<TextTrack, 'mode' | 'language'>>>[]
): TextTrack | undefined {
  return (Array.prototype as TextTrack[]).find.call(media.textTracks, ({ mode, language }) => {
    return conditions.some((condition) => {
      return (
        (condition.mode == null || condition.mode === mode) &&
        (condition.language == null || condition.language === language)
      );
    });
  });
}

export function setActiveTextTrack(
  media: HTMLMediaElement,
  tt: ActivateTextTrackInfo | undefined,
  hideActiveTrack: boolean
): boolean {
  const { textTracks } = media;
  if (textTracks.length === 0) return false;
  // console.log('setActiveTextTrack', tt);
  let changed = false;
  let activated = false;
  for (let i = 0; i < textTracks.length; i += 1) {
    const track = textTracks[i];
    // Hide active track in favor of custom/native display cues and disable others.
    if (!activated && track.language === tt?.language && (!tt.kind || track.kind === tt.kind)) {
      // Show native subtitles for IOS in video fullscreen mode
      // Otherwise hide subtitles in favor of custom implementation
      const nextMode: TextTrackMode = hideActiveTrack ? 'hidden' : 'showing';
      track.mode = nextMode;
      activated = true;
      changed = true;
    } else if (track.mode !== 'disabled') {
      track.mode = 'disabled';
      changed = true;
    }
  }
  return changed;
}

/** Dynamically add text tracks if they not exist. */
export function addTextTracks(
  media: HTMLMediaElement,
  textTrackList: readonly TextTrackItem[],
  onAdd: (el: HTMLTrackElement) => void
): void {
  // console.log('addTracks', media.textTracks.length, media.readyState);

  const existedMap = ((Array.prototype as TextTrack[]).reduce<Record<string, TextTrack>>).call(
    media.textTracks,
    (acc, tt) => {
      if (tt.language) {
        acc[tt.language] = tt;
      }
      return acc;
    },
    {}
  );

  textTrackList.forEach((tt) => {
    if (!existedMap[tt.language]) {
      const trackEl = document.createElement('track');
      trackEl.src = tt.src;
      trackEl.srclang = tt.language;
      trackEl.label = tt.label;
      trackEl.kind = tt.kind ?? 'captions';
      // Ignore `default` because the most times there are problems with loading vtt file
      // because of track mode changed from `showing` to `disabled` in the middle of loading
      // and therefore no cues are loaded.
      trackEl.default = false;
      // Add texttrack
      onAdd(media.appendChild(trackEl));
    }
  });
}

export function buildCueId(cue: Pick<TextTrackCue, 'startTime'>, index: number): string {
  return `${cue.startTime}-${index}`;
}

export function splitRows(text: string, preferLineLength: number): string[] {
  if (preferLineLength <= 0) return text.split(/\r?\n/);

  const lines = [] as string[];
  let lineIdx = 0;
  let nextLineIdx = lineIdx;
  let word = '';

  for (let i = 0; i <= text.length; i += 1) {
    const char = text[i];

    // Oversized from the prev line
    if (word.length > 0 && lineIdx < nextLineIdx) {
      lines[nextLineIdx] = char == null ? word.trim() : word.trimStart();
      word = '';
    }
    lineIdx = nextLineIdx;
    let line = lines[lineIdx] ?? '';

    // Line break
    if (char === '\n' || char === '\r\n') {
      // Add last word to the current line or keep it for the next one.
      if (word.length > 0 && line.length + word.length <= preferLineLength) {
        line += line.length > 0 ? word : word.trimStart();
        word = '';
      }
      nextLineIdx += 1;
    }
    // Word break
    else if (char === ' ') {
      if (word.length > 0) {
        const oversize = line.length + word.length > preferLineLength;
        // console.log(oversize, line, word, word.length);
        if (oversize && line.length > 0) {
          nextLineIdx += 1;
          line = line.trimEnd();
        } else {
          line += line.length === 0 ? word.trimStart() : word;
          word = '';
        }
      }
      word += char;
    }
    // The last word
    else if (char == null && word.length > 0) {
      const oversize = line.length + word.length > preferLineLength;
      // console.log(char, oversize, line);
      if (!oversize || line.length === 0) {
        line += word;
      } else {
        lineIdx += 1;
        line = word.trim();
      }
    }
    // Just add to word
    else if (char) {
      word += char;
    }

    lines[lineIdx] = line;
  }

  return lines;
}
