export function get2dContextError(): Error {
  return new Error('Failed to get canvas 2d context.');
}

export interface TakePictureOptions {
  width: number;
  height: number;
  type?: string;
  quality?: number;
}

export default function takePicture(
  element: CanvasImageSource,
  { width, height, type = 'image/jpeg', quality = 0.9 }: TakePictureOptions
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw get2dContextError();

  ctx.drawImage(element, 0, 0, width, height);

  return canvas.toDataURL(type, quality);
}
