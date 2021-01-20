import gcd from '@vzh/ts-utils/gcd';
import toInt from '@vzh/ts-utils/toInt';

export interface AspectRatio {
  width: number;
  height: number;
}

export default function getAspectRatio(width: number, height: number): AspectRatio {
  const gcdValue = gcd(width, height);
  return { width: toInt(width / gcdValue), height: toInt(height / gcdValue) };
}
