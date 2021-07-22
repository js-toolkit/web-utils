import farey from '@js-toolkit/ts-utils/farey';

export interface AspectRatio {
  /** Width ratio or width */
  width: number;
  /** Height ratio or height */
  height: number;
  /** Ratio value */
  ratio: number;
}

/** Approximate aspect ratio */
export default function getAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height;
  // https://stackoverflow.com/a/43016456
  const [rwidth, rheight] = farey(ratio, 50);
  return { width: rwidth, height: rheight, ratio };
}
