export function getRandomID(maxLength?: number | undefined): string {
  const result = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  return maxLength && maxLength > 0 ? result.substring(0, maxLength) : result;
}
