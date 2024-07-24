export function isScreenHDR(): boolean {
  // https://github.com/w3c/media-capabilities/blob/main/hdr_explainer.md
  return window.matchMedia('(dynamic-range: high)').matches;
}
