import { EventEmitter } from 'eventemitter3';
import { EventListeners } from '../../EventListeners';
import type {} from '../toggleNativeSubtitles';
import { MediaNotAttachedError } from '../MediaNotAttachedError';
import {
  type ActivateTextTrackInfo,
  type TextTrackInfo,
  type TextTrackItem,
  parseTextTracks,
  setActiveTextTrack,
  addTextTracks,
  isIOSFullscreen,
  splitRows,
  buildCueId,
} from './utils';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLMediaElementEventMap extends TextTracksEventMap {}
}

interface TextTracksEventMap {
  texttracklistchange: CustomEvent<
    TextTracksController.EventMap[TextTracksController.Events.TextTrackListChanged][0]
  >;
  texttrackchange: CustomEvent<
    TextTracksController.EventMap[TextTracksController.Events.CurrentTextTrackChanged][0]
  >;
  texttrackcuechange: CustomEvent<
    TextTracksController.EventMap[TextTracksController.Events.TextTrackCueChanged][0]
  >;
}

export interface Cue
  extends PartialBut<
    OmitStrict<VTTCue, keyof EventTarget | 'onenter' | 'onexit' | 'track' | 'pauseOnExit'>,
    'id' | 'text' | 'startTime'
  > {
  readonly rows: string[];
}

export type { TextTrackInfo, ActivateTextTrackInfo, TextTrackItem };

function dispatchNativeEvent<T extends keyof TextTracksEventMap>(
  media: HTMLMediaElement,
  type: T,
  data: TextTracksEventMap[T]['detail']
): void {
  media.dispatchEvent(new CustomEvent(type, { detail: data }));
}

export class TextTracksController
  extends EventEmitter<TextTracksController.EventMap>
  implements Disposable
{
  private readonly options: RequiredStrict<TextTracksController.Options>;
  private readonly eventListeners = new EventListeners();
  private addedTracks: HTMLTrackElement[] = [];
  private textTrackList: TextTrackInfo[] = [];
  private media: HTMLMediaElement | undefined;
  private textTrack: TextTrackInfo | undefined;
  private nextTextTrack: TextTrackInfo | undefined;

  // eslint-disable-next-line class-methods-use-this
  get Events(): typeof TextTracksController.Events {
    return TextTracksController.Events;
  }

  constructor(options?: TextTracksController.Options) {
    super();
    this.options = {
      emitNativeEvents: false,
      hideActiveTrack: true,
      preferCueRowLength: 0,
    };
    if (options) this.setOptions(options);
  }

  setOptions(options: Partial<TextTracksController.Options>): void {
    Object.assign(this.options, {
      ...options,
      emitNativeEvents: options.emitNativeEvents ?? this.options.emitNativeEvents,
      hideActiveTrack: options.hideActiveTrack ?? this.options.hideActiveTrack,
      preferCueRowLength: options.preferCueRowLength ?? this.options.preferCueRowLength,
    });
  }

  isAttached(): boolean {
    return !!this.media;
  }

  getMediaElement(): HTMLMediaElement {
    if (!this.media) throw new MediaNotAttachedError();
    return this.media;
  }

  detach(): void {
    this.eventListeners.removeAllListeners();
    this.media = undefined;
    this.addedTracks = [];
    this.textTrackList = [];
    this.textTrack = undefined;
    this.nextTextTrack = undefined;
  }

  attach(media: HTMLMediaElement): void {
    // if (this.media === media) return;
    this.detach();

    const changeHandler = (): void => {
      const { textTracks } = media;
      const { nextTextTrack } = this;
      let newCurrentIndex = -1;

      // console.log(
      //   'onchange',
      //   nextTextTrack,
      //   Array.from(textTracks).map((tt) => JSON.stringify({ lang: tt.language, mode: tt.mode })),
      //   media.webkitDisplayingFullscreen
      // );

      for (let i = 0; i < textTracks.length; i += 1) {
        const track = textTracks[i];
        // Disable default texttracks but allow select tracks in iOS native menu in fullscreen
        if (
          (track.language !== nextTextTrack?.language || track.kind !== nextTextTrack?.kind) &&
          !isIOSFullscreen(media)
        ) {
          track.mode = 'disabled';
        }
        // Disable other tracks if some track already active
        if (track.mode !== 'disabled' && newCurrentIndex >= 0) {
          track.mode = 'disabled';
        }
        if (track.mode !== 'disabled') {
          // console.log(nextTextTrack?.lang, track.mode);
          newCurrentIndex = i;
          // In iOS we use toggleNativeSubtitles so mode will be 'showing' in fullscreen and track.native will be 'true'.
          // Also keep 'showing' mode if iOS and video fullscreen.
          if (!track.native && !isIOSFullscreen(media)) {
            // If texttracks from manifest (eg. m3u8) the mode changes to 'showing'
            // so we need to set 'hidden' or leave it as is.
            const mode = this.options.hideActiveTrack ? 'hidden' : 'showing';
            if (track.mode !== mode) track.mode = mode;
          }
          if (
            track.native &&
            track.language === nextTextTrack?.language &&
            track.kind === nextTextTrack.kind
          ) {
            track.mode = 'showing';
          }
        }
      }
      // console.log('onchange end', nextTextTrack, newCurrentIndex);

      const newCurrentTrack =
        textTracks[newCurrentIndex] &&
        (this.textTrackList[newCurrentIndex] ??
          ({
            id: textTracks[newCurrentIndex].id,
            kind: textTracks[newCurrentIndex].kind,
            language: textTracks[newCurrentIndex].language,
            label: textTracks[newCurrentIndex].label,
          } satisfies TextTrackInfo));

      if (
        this.textTrack?.language !== newCurrentTrack?.language ||
        this.textTrack?.kind !== newCurrentTrack?.kind
      ) {
        this.textTrack = newCurrentTrack;
        this.nextTextTrack = this.textTrack;

        this.emit(this.Events.CurrentTextTrackChanged, {
          textTrack: this.textTrack,
          index: newCurrentIndex,
        });
        if (this.options.emitNativeEvents) {
          dispatchNativeEvent(media, 'texttrackchange', {
            textTrack: this.textTrack,
            index: newCurrentIndex,
          });
        }
      }
    };

    const cueChangeHandler = (() => {
      const lastCues = [] as VTTCue[];
      return (event: Event & { target: TextTrack }): void => {
        const { activeCues } = event.target;
        if (!activeCues) return;
        // Because cuechange triggered twice.
        let changed = lastCues.length !== activeCues.length;
        const cues = new Array<Cue>(activeCues.length);
        for (let i = 0; i < cues.length; i += 1) {
          const cue = activeCues[i] as VTTCue;
          cue.id = cue.id || buildCueId(cue, i);
          cues[i] = cue as unknown as Cue;
          (cues[i] as Writeable<Cue>).rows = splitRows(cue.text, this.options.preferCueRowLength);
          if (!changed && lastCues[i]?.id !== cue.id) {
            changed = true;
          }
          lastCues[i] = cue;
        }
        // Trim
        if (lastCues.length > cues.length) {
          lastCues.splice(cues.length - lastCues.length);
        }
        if (changed) {
          this.emit(this.Events.TextTrackCueChanged, { textTrack: event.target, cues });
          if (this.options.emitNativeEvents) {
            dispatchNativeEvent(media, 'texttrackcuechange', { textTrack: event.target, cues });
          }
        }
      };
    })();

    const onTextTracksUpdate = (): void => {
      this.textTrackList = parseTextTracks(media);
      this.emit(this.Events.TextTrackListChanged, { textTracks: this.textTrackList });
      if (this.options.emitNativeEvents) {
        dispatchNativeEvent(media, 'texttracklistchange', { textTracks: this.textTrackList });
      }
      setActiveTextTrack(
        media,
        this.textTrack ?? this.nextTextTrack,
        this.options.hideActiveTrack && !isIOSFullscreen(media)
      );
    };

    this.media = media;
    this.textTrackList = parseTextTracks(media);
    let lockUpdate = false;

    const addTrack = (track: TextTrack): void => {
      if (!lockUpdate) onTextTracksUpdate();
      this.eventListeners.scope(track).on('cuechange', cueChangeHandler as EventListener);
    };
    const removeTrack = (track: TextTrack): void => {
      onTextTracksUpdate();
      this.eventListeners.scope(track).off('cuechange', cueChangeHandler as EventListener);
    };

    this.eventListeners
      .scope(this.media.textTracks)
      .on('change', changeHandler)
      .on('addtrack', ({ track }) => track && addTrack(track))
      .on('removetrack', ({ track }) => track && removeTrack(track));

    if (this.media.textTracks.length > 0) {
      lockUpdate = true;
      try {
        Array.prototype.forEach.call(this.media.textTracks, addTrack);
        onTextTracksUpdate();
      } finally {
        lockUpdate = false;
      }
    }
  }

  getTextTracks(): readonly TextTrackInfo[] {
    return this.textTrackList;
  }

  setTextTracks(textTrackList: readonly TextTrackItem[]): void {
    const media = this.getMediaElement();
    this.eventListeners.scope(media, '@@setTextTracks').removeAllListeners();
    this.addedTracks.forEach((el) => el.remove());

    if (textTrackList.length === 0) return;

    const addTracks = (): void => {
      addTextTracks(media, textTrackList, (el) => this.addedTracks.push(el));
      // Because event 'addtrack' will be fired in the next tick.
      this.textTrackList = parseTextTracks(media);
    };

    if (media.readyState >= media.HAVE_CURRENT_DATA) {
      addTracks();
    } else {
      this.eventListeners.scope(media, '@@setTextTracks').once('loadeddata', addTracks);
    }
  }

  getActiveTextTrack(): TextTrackInfo | undefined {
    return this.textTrack;
  }

  setActiveTextTrack(tt: ActivateTextTrackInfo | undefined): boolean {
    const media = this.getMediaElement();
    this.nextTextTrack =
      tt &&
      this.textTrackList.find(
        (t) => t.language === tt.language && (!tt.kind || t.kind === tt.kind)
      );
    return setActiveTextTrack(
      media,
      this.nextTextTrack,
      this.options.hideActiveTrack && !isIOSFullscreen(media)
    );
  }

  destroy(): void {
    this.detach();
    this.removeAllListeners();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TextTracksController {
  export interface Options {
    /** Defaults to `false`. */
    readonly emitNativeEvents?: boolean | undefined;
    /** Defaults to `true`. */
    readonly hideActiveTrack?: boolean | undefined;
    /** */
    readonly preferCueRowLength?: number | undefined;
  }

  export enum Events {
    TextTrackListChanged = 'TrackListChanged',
    CurrentTextTrackChanged = 'CurrentTextTrackChanged',
    TextTrackCueChanged = 'TextTrackCueChanged',
  }

  export type EventMap = DefineAll<
    Events,
    {
      [Events.TextTrackListChanged]: [
        {
          readonly textTracks: readonly TextTrackInfo[];
        },
      ];
      [Events.CurrentTextTrackChanged]: [
        {
          readonly textTrack: TextTrackInfo | undefined;
          readonly index: number;
        },
      ];
      [Events.TextTrackCueChanged]: [
        {
          readonly textTrack: TextTrack;
          readonly cues: readonly Cue[];
        },
      ];
    }
  >;
}
