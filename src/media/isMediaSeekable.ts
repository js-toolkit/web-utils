import { getSeekableTime } from './getSeekableTime';

// export function isMediaSeekable(media: HTMLMediaElement, duration = media.duration): boolean {
//   return Number.isFinite(duration) && getSeekableTime(media) > 0;
// }
export function isMediaSeekable(media: HTMLMediaElement): boolean {
  return getSeekableTime(media) > 0;
}
