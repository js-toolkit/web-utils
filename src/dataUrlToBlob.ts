export default function dataUrlToBlob(dataUrl: string): Blob {
  const [type, base64] = dataUrl.split(',');
  const byteString = window.atob(base64);
  const mimeString = type.split(':')[1].split(';')[0];
  const ab = Uint8Array.from(byteString, (ch) => ch.charCodeAt(0)).buffer;
  return new Blob([ab], { type: mimeString });
}
