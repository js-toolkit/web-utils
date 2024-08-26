export interface BaseMediaController<T extends HTMLMediaElement = HTMLMediaElement> {
  attach(media: T, ...args: unknown[]): unknown;
  detach(): unknown;
  destroy(): unknown;
}
