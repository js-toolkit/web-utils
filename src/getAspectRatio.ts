import gcd from '@vzh/ts-utils/gcd';
import toInt from '@vzh/ts-utils/toInt';

export interface AspectRatio {
  width: number;
  height: number;
  ratio: number;
}

export default function getAspectRatio(width: number, height: number): AspectRatio {
  const gcdValue = gcd(width, height);
  const widthRatio = toInt(width / gcdValue);
  const heightRatio = toInt(height / gcdValue);
  const ratio = width / height;
  return { width: widthRatio, height: heightRatio, ratio };
}
