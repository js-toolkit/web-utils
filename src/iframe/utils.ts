export type Target = HTMLIFrameElement | Window;

export function selectFrames(): HTMLCollectionOf<HTMLIFrameElement> {
  return document.getElementsByTagName('iframe');
}

export function findTarget<T extends Target>(
  source: Window,
  targets: ArrayLike<T>
  // logger: Pick<Console, 'warn'> | undefined = console
): T | undefined {
  const { length } = targets;
  for (let i = 0; i < length; i += 1) {
    const frame = targets[i];
    const window = frame instanceof HTMLIFrameElement ? frame.contentWindow : frame;
    if (window === source) return frame;
    // if (window == null) {
    //   logger.warn(`Search target: <iframe>(#${frame.id}) contentWindow is undefined.`);
    // }
  }
  return undefined;
}

export function isWindowProxy(target: MessageEventSource): target is Window {
  return !(
    (window.MessagePort !== undefined && target instanceof MessagePort) ||
    (window.ServiceWorker !== undefined && target instanceof ServiceWorker)
  );
}

export function readTargets(list: ArrayLike<Target>): Window[] {
  // const result = new Array<Window>(list.length);
  const result = new Array<Window>();
  const { length } = list;
  for (let i = 0; i < length; i += 1) {
    const frame = list[i];
    const window = frame instanceof HTMLIFrameElement ? frame.contentWindow : frame;
    if (window) {
      result.push(window);
      // result[i] = window;
    }
  }
  return result;
}
