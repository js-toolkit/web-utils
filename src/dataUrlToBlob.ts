// https://stackoverflow.com/a/12300351
export default function dataUrlToBlob(dataUrl: string): Blob {
  const [type, base64] = dataUrl.split(',');
  const byteString = window.atob(base64);
  const mimeString = type.split(':')[1].split(';')[0];

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i += 1) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}
