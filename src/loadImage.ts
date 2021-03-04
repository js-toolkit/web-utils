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
      resolve(img);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}
