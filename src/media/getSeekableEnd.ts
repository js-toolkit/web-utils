export function getSeekableEnd(media: Pick<HTMLMediaElement, 'seekable'>): number {
  return media.seekable.length > 0 ? media.seekable.end(media.seekable.length - 1) : 0;
}
