export function getSeekableStart(media: HTMLMediaElement): number {
  return media.seekable.length > 0 ? media.seekable.start(0) : 0;
}
