import { v4 as uuid } from 'uuid';
import {
  type MessagesTypes,
  type IframeMessage,
  type IframeDataMessage,
  IFRAME_CLIENT_READY,
  IFRAME_HOST_READY,
  IFRAME_PING,
  isPingMessage,
  isTargetReadyMessage,
} from './messages';
import { getOriginFromMessage } from './getOriginFromMessage';
import { isWindowProxy } from './utils';

interface AutoConnectClient {
  readonly ready: (origin?: string) => void;
  readonly destroy: VoidFunction;
}

interface AutoConnectClientOptions<T = unknown> {
  readonly data: T;
  readonly target?: MessageEventSource | undefined;
  readonly isReady?: () => boolean;
  readonly onConnect: <T = unknown>(data: T, origin: string, port?: MessagePort) => void;
  readonly logger?: Pick<Console, 'debug'> | undefined;
  readonly messagesTypes?: Partial<MessagesTypes>;
}

export function getAutoConnectClient<T = unknown>({
  data,
  target = window.parent,
  isReady = () => true,
  onConnect,
  logger = console,
  messagesTypes: messagesTypes0,
}: AutoConnectClientOptions<T>): AutoConnectClient {
  const messagesTypes: MessagesTypes = {
    Ping: messagesTypes0?.Ping || IFRAME_PING,
    TargetReady: messagesTypes0?.TargetReady || IFRAME_HOST_READY,
    SelfReady: messagesTypes0?.SelfReady || IFRAME_CLIENT_READY,
  };

  // let readySent = false;
  const uid = uuid();
  let port: MessagePort | undefined;

  const post = <M extends IframeMessage>(
    target: MessageEventSource,
    message: M,
    origin: string
  ): void => {
    if (window === target) return;
    if (isWindowProxy(target)) {
      target.postMessage(message, origin);
      logger.debug(`Post message to parent window (origin=${origin}):`, message);
    } else {
      target.postMessage(message);
      logger.debug(`Post message to parent MessageEventSource:`, message);
    }
  };

  const sendPing: AutoConnectClient['ready'] = (origin = '*') => {
    post<IframeMessage<'Ping'>>(target, { uid, type: messagesTypes.Ping }, origin);
  };

  const sendReadyMaybe = (target: MessageEventSource, readyData: T, origin: string): void => {
    if (!isReady()) return;
    post<IframeDataMessage<'SelfReady', T>>(
      target,
      { uid, type: messagesTypes.SelfReady, data: readyData },
      origin
    );
    // readySent = true;
  };

  const onReceiveMessage = (message: MessageEvent): void => {
    if (!message.source || message.source !== target) return;
    if (
      !isPingMessage(message.data, messagesTypes) &&
      !isTargetReadyMessage(message.data, messagesTypes)
    ) {
      return;
    }
    // if (!isIframeHostReadyMessage(message.data)) return;
    logger.debug(`Receive message from parent window (origin=${message.origin}):`, message.data);

    const origin = getOriginFromMessage(message);

    // Ping from host
    if (isPingMessage(message.data, messagesTypes)) {
      sendReadyMaybe(message.source, data, origin);
    }
    // Host ready
    else {
      // if (!readySent) sendReady(data, origin);
      // Close receive channel
      complete();
      const { data } = message.data;
      [port] = message.ports;
      onConnect(data, origin, port);
      logger.debug('Iframe connected.');
    }
  };

  const complete = (): void => {
    window.removeEventListener('message', onReceiveMessage);
  };

  window.addEventListener('message', onReceiveMessage);

  return {
    ready: sendPing,
    destroy: () => {
      complete();
      if (port) {
        port.close();
        port.onmessage = null;
        port.onmessageerror = null;
      }
    },
  };
}
