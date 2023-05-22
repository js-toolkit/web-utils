import { getTimeRangeDuration } from './timeRanges';

export function isMediaSeekable(media: HTMLMediaElement): boolean {
  return getTimeRangeDuration(media.seekable) > 0;
}
