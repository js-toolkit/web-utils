import gcd from '@js-toolkit/ts-utils/gcd';
import toInt from '@js-toolkit/ts-utils/toInt';

export interface AspectRatio {
  /** Width ratio or width */
  width: number;
  /** Height ratio or height */
  height: number;
  /** Ratio value */
  ratio: number;
}

export default function getAspectRatio(width: number, height: number): AspectRatio {
  const gcdValue = gcd(width, height);
  const widthRatio = toInt(width / gcdValue);
  const heightRatio = toInt(height / gcdValue);
  const ratio = width / height;
  return { width: widthRatio, height: heightRatio, ratio };
}
