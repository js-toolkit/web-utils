export default function getOriginFromMessage({ origin }: MessageEvent): string {
  return !origin || origin === 'null' || origin === 'undefined' ? '*' : origin;
}
