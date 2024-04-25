import type {} from '../../FullscreenController';
import { isIOS } from '../../platform/isIOS';

declare global {
  interface TextTrack {
    customGroupId?: string | undefined;
  }
}

export type TextTrackItem = Readonly<
  PartialSome<
    RequiredStrict<
      Pick<HTMLTrackElement, 'src' | 'default'> & Pick<TextTrack, 'kind' | 'label' | 'language'>
    >,
    'default' | 'kind'
  >
>;

export interface TextTrackInfo extends Pick<TextTrackItem, 'kind' | 'language' | 'label'> {}

export type ActivateTextTrackInfo = OptionalToUndefined<
  PartialBut<Pick<TextTrackInfo, 'kind' | 'language'>, 'language'>
>;

const DETACHED_GROUP_ID = '__detached__';

/** Hack: MSE can't remove texttracks on detaching because of no browser api for that. */
export function fakeDetachTextTracks(media: HTMLMediaElement): void {
  ([] as TextTrack[]).forEach.call(media.textTracks, (textTrack) => {
    const track = textTrack;
    if (track.customGroupId) {
      track.customGroupId = DETACHED_GROUP_ID;
    }
  });
}

export function parseTextTracks(media: HTMLMediaElement): TextTrackInfo[] {
  if (media.textTracks.length === 0) return [];
  return Array.from(media.textTracks)
    .filter((track) => track.customGroupId !== DETACHED_GROUP_ID && !!track.language)
    .map(({ kind, language, label }) => ({ kind, language, label: label ?? '' }));
}

export function isIOSFullscreen(media: HTMLMediaElement): boolean {
  return isIOS() && !!media.webkitDisplayingFullscreen;
}

export function setActiveTextTrack(
  media: HTMLMediaElement,
  tt: ActivateTextTrackInfo | undefined,
  hideActiveTrack: boolean
): void {
  const { textTracks } = media;
  if (textTracks.length === 0) return;
  // console.log('setActiveTextTrack', tt);
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
    } else {
      track.mode = 'disabled';
    }
  }
}

/** Dynamically add text tracks */
export function addTextTracks(
  media: HTMLMediaElement,
  textTrackList: readonly TextTrackItem[],
  onAdd: (el: HTMLTrackElement) => void
): void {
  // console.log('addTracks', media.textTracks.length, media.readyState);

  const textTrackMap = Array.from(media.textTracks).reduce(
    (acc, tt) => {
      if (tt.language) {
        acc[tt.language] = tt;
      }
      return acc;
    },
    {} as Record<string, TextTrack>
  );

  textTrackList.forEach((tt) => {
    if (!textTrackMap[tt.language]) {
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
