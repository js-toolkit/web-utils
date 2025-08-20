import { hasIn } from '@js-toolkit/utils/hasIn';

export function get2dContextError(): Error {
  return new Error('Failed to get canvas 2d context.');
}

const getDefaultWidth = (element: CanvasImageSource): number => {
  if (element instanceof HTMLVideoElement) {
    return element.videoWidth;
  }
  if (hasIn(element, 'displayWidth')) {
    return element.displayWidth;
  }
  return element.width instanceof SVGAnimatedLength ? element.width.animVal.value : element.width;
};

const getDefaultHeight = (element: CanvasImageSource): number => {
  if (element instanceof HTMLVideoElement) {
    return element.videoHeight;
  }
  if (hasIn(element, 'displayHeight')) {
    return element.displayHeight;
  }
  return element.height instanceof SVGAnimatedLength
    ? element.height.animVal.value
    : element.height;
};

export interface TakeScreenshotOptions {
  width?: number | undefined;
  height?: number | undefined;
  type?: string | undefined;
  quality?: number | undefined;
}

export function takeScreenshot(
  element: CanvasImageSource,
  {
    width = getDefaultWidth(element),
    height = getDefaultHeight(element),
    type = 'image/jpeg',
    quality = 1,
  }: TakeScreenshotOptions = {}
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw get2dContextError();

  ctx.drawImage(element, 0, 0);

  return canvas.toDataURL(type, quality);
}

export function takeScreenshotAsync(
  element: CanvasImageSource,
  {
    width = getDefaultWidth(element),
    height = getDefaultHeight(element),
    type = 'image/jpeg',
    quality = 1,
  }: TakeScreenshotOptions = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw get2dContextError();

    ctx.drawImage(element, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob == null) reject(new Error('Unable get blob'));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}
