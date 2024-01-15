/* eslint-disable no-param-reassign */

import type { BaseMediaController } from './BaseMediaController';
import { resetMedia } from './resetMedia';

export function attachMediaStream(media: HTMLMediaElement, stream: MediaStream | undefined): void {
  // Reassign stream will trigger events onEmptied, onLoadStart and so on.
  // If stream is empty or has only audio and muted then will fire onLoadStart and stop on it,
  // so we need assign null instead of empty stream in order for fire onEmptied and stop on it.
  if (
    stream &&
    stream.active &&
    media.muted &&
    // Assign null if screen sharing (especially for local stream)
    stream.getVideoTracks().filter((t) => !(t.getSettings() as AnyObject).displaySurface).length ===
      0
  ) {
    media.srcObject = null;
    return;
  }
  media.srcObject = stream && stream.active ? stream : null;
}

export function removeTrack(mediaStream: MediaStream, track: MediaStreamTrack): void {
  mediaStream.removeTrack(track);
  // Dispatch event manually because on local stream it not fired
  mediaStream.dispatchEvent(new MediaStreamTrackEvent('removetrack', { track }));
}

export function addTrack(
  mediaStream: MediaStream,
  track: MediaStreamTrack,
  onEnded?: VoidFunction | undefined
): void {
  mediaStream.addTrack(track);
  // Dispatch event manually because on local stream it not fired
  mediaStream.dispatchEvent(new MediaStreamTrackEvent('addtrack', { track }));
  // When track is uncontrolled ended then remove it from stream
  track.addEventListener(
    'ended',
    () => {
      removeTrack(mediaStream, track);
      onEnded && onEnded();
    },
    { once: true }
  );
}

export class MediaStreamController implements BaseMediaController {
  private media: HTMLMediaElement | undefined;

  constructor(private mediaStream: MediaStream) {}

  attach(media: HTMLMediaElement): void {
    // if (this.media !== media) {
    //   this.detachMedia();
    // }
    this.media = media;
    attachMediaStream(media, this.mediaStream);
  }

  detach(): void {
    if (this.media) {
      const { media } = this;
      this.media = undefined;
      resetMedia(media);
    }
  }

  updateStream(stream: MediaStream): void {
    if (this.mediaStream === stream) return;
    const { media } = this;
    // this.detachMedia();
    this.mediaStream = stream;
    media && this.attach(media);
  }

  removeTrack(track: MediaStreamTrack): void {
    removeTrack(this.mediaStream, track);
  }

  addTrack(track: MediaStreamTrack, onEnded?: VoidFunction | undefined): void {
    addTrack(this.mediaStream, track, () => {
      this.removeTrack(track);
      onEnded && onEnded();
    });
  }

  reset(): void {
    this.mediaStream.getTracks().forEach((track) => {
      track.stop();
      this.removeTrack(track);
    });
  }

  destroy(): void {
    this.detach();
    this.reset();
  }
}
