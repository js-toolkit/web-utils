import onDOMReady from '../onDOMReady';
import getOriginFromMessage from './getOriginFromMessage';
import {
  IframeHostReadyMessage,
  IframePingMessage,
  isIframeClientReadyMessage,
  IFRAME_HOST_READY,
  IFRAME_PING,
  IframeMessage,
  isPingMessage,
} from './messages';

function selectFrames(): HTMLCollectionOf<HTMLIFrameElement> {
  return document.getElementsByTagName('iframe');
}

function findIframeElement(source: Window): HTMLIFrameElement | undefined {
  const items = selectFrames();
  for (let i = 0; i < items.length; i += 1) {
    const frame = items[i];
    if (frame.contentWindow === source) return frame;
  }
  return undefined;
}

interface AutoConnectHost {
  readonly start: (...iframes: HTMLIFrameElement[]) => void;
  readonly stop: VoidFunction;
  /** Send `ready` to iframe. */
  readonly ready: <T>(data: T, target: Window, origin?: string) => void;
}

interface AutoConnectHostOptions<T = AnyObject> {
  readonly onSendData?: (iframe: HTMLIFrameElement, origin: string) => T;
  readonly onConnect: (data: unknown, iframe: HTMLIFrameElement, origin: string) => void;
  readonly logger?: Pick<Console, 'warn' | 'debug'>;
}

export default function getAutoConnectHost<T>({
  onSendData,
  onConnect,
  logger = console,
}: AutoConnectHostOptions<T>): AutoConnectHost {
  let disposer: VoidFunction | undefined;

  const post = <M extends IframeMessage<string>>(
    message: M,
    target: Window,
    origin: string
  ): void => {
    if (window === target) return;
    target.postMessage(message, origin);
    logger.debug(`Post message to iframe (origin=${origin}):`, message);
  };

  const sendPing = (target: Window, origin: string): void => {
    post<IframePingMessage>({ type: IFRAME_PING }, target, origin);
  };

  const sendReady = <D>(readyData: D, target: Window, origin = '*'): void => {
    post<IframeHostReadyMessage<D>>({ type: IFRAME_HOST_READY, data: readyData }, target, origin);
  };

  const onReceiveMessage = (message: MessageEvent): void => {
    if (!message.source || message.source === window) return;
    if (!isPingMessage(message.data) && !isIframeClientReadyMessage(message.data)) return;
    // if (!isIframeClientReadyMessage(message.data)) return;
    logger.debug(`Receive message from iframe (origin=${message.origin}):`, message.data);

    const iframe = findIframeElement(message.source as Window);
    if (!iframe) {
      logger.warn('Could not find <iframe> by message.source.');
      return;
    }
    if (!iframe.contentWindow) {
      logger.warn(`<iframe>(#${iframe.id}) contentWindow is undefined.`);
      return;
    }

    const origin = getOriginFromMessage(message);

    // Ping from iframe
    if (isPingMessage(message.data)) {
      sendPing(iframe.contentWindow, origin);
    }
    // Iframe ready
    else {
      sendReady(onSendData ? onSendData(iframe, origin) : undefined, iframe.contentWindow, origin);
      const { data } = message.data;
      setTimeout(() => {
        onConnect(data, iframe, origin);
        logger.debug('Iframe Host connected.');
      }, 0);
    }
  };

  const start = (...iframes: HTMLIFrameElement[]): void => {
    if (disposer) {
      logger.warn('Already started. You should first call `stop`.');
      return;
    }

    const cancel = onDOMReady(() => {
      window.addEventListener('message', onReceiveMessage);
      // Post message to all iframes
      const frames = iframes.length > 0 ? iframes : selectFrames();
      for (let i = 0; i < frames.length; i += 1) {
        const frame = frames[i];
        frame.contentWindow && sendPing(frame.contentWindow, '*');
      }
    });

    disposer = () => {
      cancel();
      window.removeEventListener('message', onReceiveMessage);
    };
  };

  const stop = (): void => {
    if (disposer) {
      disposer();
      disposer = undefined;
    }
  };

  return {
    start,
    stop,
    ready: sendReady,
  };
}
