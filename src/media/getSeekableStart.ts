export function getSeekableStart(media: Pick<HTMLMediaElement, 'seekable'>): number {
  return media.seekable.length > 0 ? media.seekable.start(0) : 0;
}
