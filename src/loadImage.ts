/** Don't worry, it uses cached by browser image if url already loaded previously otherwise cache the image. */
export default function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}
