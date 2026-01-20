export enum ViewSize {
  /** minWidth=0, maxWidth=319 */
  xxxxs = 1,
  /** minWidth=320, maxWidth=479 */
  xxxs = 2,
  /** minWidth=480, maxWidth=639 */
  xxs = 3,
  /** minWidth=640, maxWidth=827 */
  xs = 4,
  /** minWidth=828, maxWidth=1023 */
  s = 5,
  /** minWidth=1024, maxWidth=1365 */
  m = 6,
  /** minWidth=1366, maxWidth=1599 */
  l = 7,
  /** minWidth=1600, maxWidth=1919 */
  xl = 8,
  /** minWidth=1920, maxWidth=2559 */
  xxl = 9,
  /** minWidth=2560, maxWidth=3839 */
  xxxl = 10,
  /** minWidth=3840, maxWidth=7679 */
  xxxxl = 11,
  /** minWidth=7680, maxWidth=Number.MAX_SAFE_INTEGER */
  xxxxxl = 12,
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ViewSize {
  export type Type = ExtractKeysOfType<typeof ViewSize, number>;
  export type Keys = keyof Type;

  export interface Values {
    readonly minWidth: number;
    readonly maxWidth: number;
  }

  /** All values are unique. */
  export const values: Readonly<Record<ViewSize, Values>> = {
    [ViewSize.xxxxs]: { minWidth: 0, maxWidth: 319 },
    [ViewSize.xxxs]: { minWidth: 320, maxWidth: 479 },
    [ViewSize.xxs]: { minWidth: 480, maxWidth: 639 },
    [ViewSize.xs]: { minWidth: 640, maxWidth: 827 },
    [ViewSize.s]: { minWidth: 828, maxWidth: 1023 },
    [ViewSize.m]: { minWidth: 1024, maxWidth: 1365 },
    [ViewSize.l]: { minWidth: 1366, maxWidth: 1599 },
    [ViewSize.xl]: { minWidth: 1600, maxWidth: 1919 },
    [ViewSize.xxl]: { minWidth: 1920, maxWidth: 2559 },
    [ViewSize.xxxl]: { minWidth: 2560, maxWidth: 3839 },
    [ViewSize.xxxxl]: { minWidth: 3840, maxWidth: 7679 },
    [ViewSize.xxxxxl]: { minWidth: 7680, maxWidth: Number.MAX_SAFE_INTEGER },
  };

  export function of(viewSizeNumber: string): ViewSize {
    const num = +viewSizeNumber;
    const key = (Number.isFinite(num) ? ViewSize[num] : viewSizeNumber) as Keys;
    return ViewSize[key];
  }

  export function keyOf(viewSize: ViewSize): Keys {
    return ViewSize[viewSize] as Keys;
  }

  /** Sorted values. */
  export const valueList: readonly (readonly [ViewSize, Values])[] = Object.entries(values)
    .map(([key, value]) => [of(key), value] as const)
    .sort(([, a], [, b]) => a.minWidth - b.minWidth);

  export function get(width: number): ViewSize {
    const viewSize =
      valueList.find(([, value]) => width >= value.minWidth && width <= value.maxWidth)?.[0] ??
      valueList.at(-1)![0];
    return viewSize;
  }

  export function lt(size: ViewSize, than: ViewSize): boolean {
    return size < than;
  }

  export function lte(size: ViewSize, than: ViewSize): boolean {
    return size <= than;
  }

  export function gt(size: ViewSize, than: ViewSize): boolean {
    return size > than;
  }

  export function gte(size: ViewSize, than: ViewSize): boolean {
    return size >= than;
  }
}
