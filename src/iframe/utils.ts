export type Target = HTMLIFrameElement | Window;

export function selectFrames(): HTMLCollectionOf<HTMLIFrameElement> {
  return document.getElementsByTagName('iframe');
}

export function findTarget<T extends Target>(
  source: Window,
  targets: ArrayLike<T>
  // logger: Pick<Console, 'warn'> | undefined = console
): T | undefined {
  for (let i = 0; i < targets.length; i += 1) {
    const frame = targets[i];
    const window = frame instanceof HTMLIFrameElement ? frame.contentWindow : frame;
    if (window === source) return frame;
    // if (window == null) {
    //   logger.warn(`Search target: <iframe>(#${frame.id}) contentWindow is undefined.`);
    // }
  }
  return undefined;
}
