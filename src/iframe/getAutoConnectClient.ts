import { getOriginFromMessage } from './getOriginFromMessage';
import {
  type IframeClientReadyMessage,
  type IframePingMessage,
  type IframeMessage,
  IFRAME_CLIENT_READY,
  IFRAME_PING,
  isIframeHostReadyMessage,
  isPingMessage,
} from './messages';

interface AutoConnectClient {
  readonly dispose: VoidFunction;
  readonly ready: VoidFunction;
}

interface AutoConnectClientOptions<T = unknown> {
  readonly data: T;
  readonly isReady?: () => boolean;
  readonly onConnect: (data: unknown, origin: string) => void;
  readonly logger?: Pick<Console, 'debug'> | undefined;
}

export function getAutoConnectClient<T = unknown>({
  data,
  isReady = () => true,
  onConnect,
  logger = console,
}: AutoConnectClientOptions<T>): AutoConnectClient {
  // let readySent = false;

  const post = <M extends IframeMessage<string>>(message: M, origin: string): void => {
    if (window === window.parent) return;
    window.parent.postMessage(message, origin);
    logger.debug(`Post message to parent window (origin=${origin}):`, message);
  };

  const sendPing = (origin = '*'): void => {
    post<IframePingMessage>({ type: IFRAME_PING }, origin);
  };

  const sendReadyMaybe = (readyData: T, origin: string): void => {
    if (!isReady()) return;
    post<IframeClientReadyMessage<T>>({ type: IFRAME_CLIENT_READY, data: readyData }, origin);
    // readySent = true;
  };

  const onReceiveMessage = (message: MessageEvent): void => {
    if (message.source !== window.parent) return;
    if (!isPingMessage(message.data) && !isIframeHostReadyMessage(message.data)) return;
    // if (!isIframeHostReadyMessage(message.data)) return;
    logger.debug(`Receive message from parent window (origin=${message.origin}):`, message.data);

    const origin = getOriginFromMessage(message);

    // Ping from host
    if (isPingMessage(message.data)) {
      sendReadyMaybe(data, origin);
    }
    // Host ready
    else {
      // if (!readySent) sendReady(data, origin);
      // Close receive channel
      complete();
      onConnect(message.data.data, origin);
      logger.debug('Iframe connected.');
    }
  };

  const complete = (): void => {
    window.removeEventListener('message', onReceiveMessage);
  };

  window.addEventListener('message', onReceiveMessage);

  return {
    ready: sendPing,
    dispose: complete,
  };
}

export default getAutoConnectClient;
