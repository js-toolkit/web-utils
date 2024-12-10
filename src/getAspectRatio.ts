import { farey } from '@js-toolkit/utils/farey';

export interface AspectRatio {
  /** Approximate ratio of the width. Eg. 16 of 16/9. */
  width: number;
  /** Approximate ratio of the height. Eg. 9 of 16/9. */
  height: number;
  /** Actual ratio value. */
  ratio: number;
}

/** Approximate aspect ratio */
export function getAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height;
  // https://stackoverflow.com/a/43016456
  const [rwidth, rheight] = farey(ratio, 50);
  return { width: rwidth, height: rheight, ratio };
}
