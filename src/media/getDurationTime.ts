export function getDurationTime(media: Pick<HTMLMediaElement, 'duration'>): number {
  return Number.isFinite(media.duration) && media.duration >= 0 ? media.duration : NaN;
}
