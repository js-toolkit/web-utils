let memo: boolean;

export default function isNativeHlsSupported(): boolean {
  if (memo == null) {
    memo = !!document.createElement('video').canPlayType('application/vnd.apple.mpegURL');
  }
  return memo;
}
