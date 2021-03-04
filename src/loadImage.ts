/** Don't worry, it uses cached by browser image if url already loaded previously otherwise cache the image. */
export default function loadImage(
  imageUrl: string,
  crossOrigin?: HTMLImageElement['crossOrigin']
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin !== undefined) {
      img.crossOrigin = crossOrigin;
    }
    img.onload = () => {
      img.onload = null;
      img.onerror = null;
      resolve(img);
    };
    img.onerror = (event) => {
      img.onload = null;
      img.onerror = null;
      reject(event);
    };
    img.src = imageUrl;
  });
}
