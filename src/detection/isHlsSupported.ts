import { isSupported } from 'hls.js/src/is-supported';

export default function isHlsSupported(): boolean {
  return isSupported();
}
