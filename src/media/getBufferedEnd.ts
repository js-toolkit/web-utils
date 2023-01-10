export function getBufferedEnd(media: HTMLMediaElement): number {
  return (media.buffered.length > 0 && media.buffered.end(media.buffered.length - 1)) || 0;
}
