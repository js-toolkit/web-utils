export function getSeekableTime(media: Pick<HTMLMediaElement, 'seekable'>): number {
  return media.seekable.length > 0
    ? media.seekable.end(media.seekable.length - 1) - media.seekable.start(0)
    : 0;
}
