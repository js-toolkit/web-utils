/** Don't worry, it uses cached by browser image if url already loaded previously otherwise cache the image. */
export function loadImage(
  src:
    | string
    | OptionalToUndefined<
        PartialBut<Pick<HTMLImageElement, 'src' | 'srcset' | 'crossOrigin' | 'sizes'>, 'src'>
      >
  // crossOrigin?: HTMLImageElement['crossOrigin'] | undefined
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img.onload = null;
      img.onerror = null;
      resolve(img);
    };
    img.onerror = (event) => {
      img.onload = null;
      img.onerror = null;
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(event);
    };
    if (typeof src === 'string') {
      img.src = src;
    } else {
      const { crossOrigin, ...rest } = src;
      if (crossOrigin !== undefined) {
        img.crossOrigin = crossOrigin;
      }
      Object.assign(img, rest);
    }
  });
}
