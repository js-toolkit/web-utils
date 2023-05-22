export function getTimeRangeStart(timeRanges: TimeRanges): number {
  return timeRanges.length > 0 ? timeRanges.start(0) : 0;
}

export function getTimeRangeEnd(timeRanges: TimeRanges): number {
  return timeRanges.length > 0 ? timeRanges.end(timeRanges.length - 1) : 0;
}

export function getTimeRangeDuration(timeRanges: TimeRanges): number {
  return getTimeRangeEnd(timeRanges) - getTimeRangeStart(timeRanges);
}
