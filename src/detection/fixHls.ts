import 'hls.js/src/is-supported';

declare global {
  interface MediaSource {
    prototype: MediaSource;
    new (): MediaSource;
    isTypeSupported(type: string): boolean;
  }
}
