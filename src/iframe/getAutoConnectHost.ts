import { v4 as uuid } from 'uuid';
import { onDOMReady } from '../onDOMReady';
import {
  type MessagesTypes,
  type IframeMessage,
  type IframeDataMessage,
  IFRAME_HOST_READY,
  IFRAME_CLIENT_READY,
  IFRAME_PING,
  isPingMessage,
  isTargetReadyMessage,
} from './messages';
import { isWindowProxy, selectFrames } from './utils';
import { getOriginFromMessage } from './getOriginFromMessage';

interface AutoConnectHost {
  readonly start: (
    ...iframes: readonly HTMLIFrameElement[] | [() => readonly HTMLIFrameElement[]]
  ) => void;
  readonly stop: VoidFunction;
  readonly destroy: VoidFunction;
  /** Send `ready` to iframe. */
  readonly ready: <T>(data: T, target: MessageEventSource, origin?: string | undefined) => void;
}

// interface AutoConnectHostOptions<T = AnyObject> {
//   readonly onSendData?: ((iframe: HTMLIFrameElement, origin: string) => T) | undefined;
//   readonly onConnect: (
//     data: unknown,
//     iframe: HTMLIFrameElement,
//     origin: string,
//     port: MessagePort
//   ) => void;
//   readonly logger?: Pick<Console, 'warn' | 'debug'> | undefined;
// }

export type AutoConnectHostOptions<T = AnyObject> = {
  readonly onSendData?: ((target: MessageEventSource, origin: string) => T) | undefined;
  readonly logger?: Pick<Console, 'warn' | 'debug'> | undefined;
  readonly messagesTypes?: Partial<MessagesTypes>;
} & (
  | {
      readonly openChannel: true;
      readonly onConnect: <T = unknown>(
        data: T,
        target: MessageEventSource,
        // iframe: HTMLIFrameElement,
        origin: string,
        port: MessagePort
      ) => void;
    }
  | {
      readonly openChannel?: false | undefined;
      // readonly onConnect: <T = unknown>(data: T, iframe: HTMLIFrameElement, origin: string) => void;
      readonly onConnect: <T = unknown>(
        data: T,
        target: MessageEventSource,
        origin: string
      ) => void;
    }
);

export function getAutoConnectHost<T>({
  onSendData,
  logger = console,
  openChannel,
  onConnect,
  messagesTypes: messagesTypes0,
}: AutoConnectHostOptions<T>): AutoConnectHost {
  const messagesTypes: MessagesTypes = {
    Ping: messagesTypes0?.Ping || IFRAME_PING,
    TargetReady: messagesTypes0?.TargetReady || IFRAME_CLIENT_READY,
    SelfReady: messagesTypes0?.SelfReady || IFRAME_HOST_READY,
  };

  let disposer: VoidFunction | undefined;
  let specialIframes: readonly HTMLIFrameElement[] | undefined;

  const uid = uuid();
  const channel = openChannel ? new MessageChannel() : undefined;

  const post = <M extends IframeMessage>(
    message: M,
    target: MessageEventSource,
    origin: string,
    transfer?: Transferable[] | undefined
  ): void => {
    if (window === target) return;
    if (isWindowProxy(target)) {
      target.postMessage(message, origin, transfer);
      logger.debug(`Post message to iframe (origin=${origin}):`, message);
    } else {
      target.postMessage(message, transfer && { transfer });
      logger.debug(`Post message to MessageEventSource:`, message);
    }
  };

  const sendPing = (target: MessageEventSource, origin: string): void => {
    post<IframeMessage<'Ping'>>({ uid, type: messagesTypes.Ping }, target, origin);
  };

  const sendReady: AutoConnectHost['ready'] = (data, target, origin = '*') => {
    post<IframeDataMessage<'SelfReady', unknown>>(
      { uid, type: messagesTypes.SelfReady, data },
      target,
      origin,
      channel ? [channel.port2] : undefined
    );
  };

  const onReceiveMessage = (message: MessageEvent): void => {
    if (!message.source || message.source === window) return;
    if (
      !isPingMessage(message.data, messagesTypes) &&
      !isTargetReadyMessage(message.data, messagesTypes)
    ) {
      return;
    }
    logger.debug(`Receive message from iframe (origin=${message.origin}):`, message.data);

    // const iframe = findIframeElement(message.source as Window, specialIframes, logger);
    // if (!iframe) {
    //   logger.warn('Could not find <iframe> by message.source.');
    //   return;
    // }
    // if (!iframe.contentWindow) {
    //   logger.warn(`<iframe>(#${iframe.id}) contentWindow is undefined.`);
    //   return;
    // }

    const target = message.source;
    const origin = getOriginFromMessage(message);

    // Ping from iframe
    if (isPingMessage(message.data, messagesTypes)) {
      sendPing(target, origin);
    }
    // Iframe ready
    else {
      sendReady(onSendData ? onSendData(target, origin) : undefined, target, origin);
      const { data } = message.data;
      setTimeout(() => {
        // if (openChannel && channel) onConnect(data, iframe, origin, channel.port1);
        // else if (!openChannel) onConnect(data, iframe, origin);
        if (openChannel && channel) onConnect(data, target, origin, channel.port1);
        else if (!openChannel) onConnect(data, target, origin);
        logger.debug('Iframe Host connected.');
      }, 0);
    }
  };

  const start: AutoConnectHost['start'] = (...iframes): void => {
    if (disposer) {
      logger.warn('Already started. You should first call `stop`.');
      return;
    }

    const cancel = onDOMReady(() => {
      specialIframes = (() => {
        const list =
          typeof iframes[0] === 'function'
            ? iframes[0]()
            : (iframes as readonly HTMLIFrameElement[]);
        return list.length > 0 ? list : undefined;
      })();

      // Post message to all iframes
      const frames = specialIframes || selectFrames();
      window.addEventListener('message', onReceiveMessage);
      for (let i = 0; i < frames.length; i += 1) {
        const frame = frames[i];
        frame.contentWindow && sendPing(frame.contentWindow, '*');
      }
    });

    disposer = () => {
      cancel();
      window.removeEventListener('message', onReceiveMessage);
      specialIframes = undefined;
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
    destroy: () => {
      stop();
      if (channel) {
        channel.port1.close();
        channel.port2.close();
        channel.port1.onmessage = null;
        channel.port1.onmessageerror = null;
      }
    },
  };
}
