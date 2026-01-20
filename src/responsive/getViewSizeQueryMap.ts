import { ViewSize } from './ViewSize';

export function getViewSizeQueryMap(): Record<ViewSize, string> {
  return ViewSize.valueList.reduce(
    (acc, [viewSize, { minWidth, maxWidth }]) => {
      acc[viewSize] = `only screen and (min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;
      return acc;
    },
    {} as Record<ViewSize, string>
  );
}
