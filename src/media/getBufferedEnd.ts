export function getBufferedEnd(media: Pick<HTMLMediaElement, 'buffered'>): number {
  return (media.buffered.length > 0 && media.buffered.end(media.buffered.length - 1)) || 0;
}
