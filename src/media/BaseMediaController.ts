export interface BaseMediaController<T extends HTMLMediaElement = HTMLMediaElement> {
  attach(media: T, ...args: unknown[]): void;
  detach(): void;
  destroy(): void;
}
