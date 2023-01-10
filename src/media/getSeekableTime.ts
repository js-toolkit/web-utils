export function getSeekableTime(media: HTMLMediaElement): number {
  return media.seekable.length > 0
    ? media.seekable.end(media.seekable.length - 1) - media.seekable.start(0)
    : 0;
}
