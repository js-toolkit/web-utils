import { v4 as uuid } from 'uuid';
import log from '@js-toolkit/utils/log';
import { onDOMReady } from '../onDOMReady';
import {
  type MessagesTypes,
  type IframeMessage,
  type IframeDataMessage,
  isPingMessage,
  isTargetReadyMessage,
} from './messages';
import { isWindowProxy, readTargets, type Target } from './utils';
import { getOriginFromMessage } from './getOriginFromMessage';

export { getClientMessages, getHostMessages } from './messages';

interface StartOptions {
  readonly append?: boolean;
}

interface AutoConnector extends Disposable {
  /** If function passed the connector waits until DOM ready. */
  readonly start: (
    targets: ArrayLike<Target> | (() => ArrayLike<Target>),
    options?: StartOptions
  ) => void;
  /** Stops a receiving new connections. */
  readonly stop: VoidFunction;
  readonly isStarted: () => boolean;
  // readonly getChannel: () => AutoConnector.Channel;
  readonly close: (targets: ArrayLike<Target>) => void;
  readonly destroy: VoidFunction;
}

// // eslint-disable-next-line @typescript-eslint/no-namespace
// export namespace AutoConnector {
//   export interface Channel
//     extends Pick<
//       MessagePort,
//       'start' | 'close' | 'addEventListener' | 'removeEventListener' | 'postMessage'
//     > {}
// }

interface TargetInfo {
  readonly target: Window;
  readonly origin: string;
}

interface ConnectTargetInfo<ReceiveData = unknown> extends TargetInfo {
  readonly data: ReceiveData;
}

export type AutoConnectorOptions<SendData = AnyObject, ReceiveData = unknown> = {
  readonly id?: string | undefined;
  readonly label?: string | undefined;
  readonly onSendData?: ((info: TargetInfo) => SendData) | undefined;
  readonly messagesTypes: MessagesTypes;
  /** Process messages only from targets passed to `start` method. Default `true`. */
  readonly strictTargets?: boolean;
  readonly logger?: Pick<log.Logger, 'v1' | 'warn'> | undefined;
  // readonly channel?: 'open' | 'use' | undefined;
  // readonly onConnect: (
  //   info: ConnectTargetInfo<ReceiveData>,
  //   channel: AutoConnector.Channel | undefined
  // ) => void;
} & (
  | {
      readonly channel: 'open' | 'use';
      readonly onConnect: (info: ConnectTargetInfo<ReceiveData>, port: MessagePort) => void;
    }
  | {
      readonly channel?: undefined;
      readonly onConnect: (info: ConnectTargetInfo<ReceiveData>) => void;
    }
);

// function createChannelProxy(channelMap: Map<string, MessageChannel>): AutoConnector.Channel {
//   return {
//     addEventListener(...args: Parameters<MessagePort['addEventListener']>) {
//       channelMap.forEach(({ port1 }) => port1.addEventListener(...args));
//     },

//     removeEventListener(...args: Parameters<MessagePort['removeEventListener']>) {
//       channelMap.forEach(({ port1 }) => port1.removeEventListener(...args));
//     },

//     start() {
//       channelMap.forEach(({ port1 }) => port1.start());
//     },

//     close() {
//       channelMap.forEach(({ port1 }) => port1.close());
//     },

//     postMessage(message, options, ...args) {
//       channelMap.forEach(({ port1 }) => {
//         port1.postMessage(message, options as StructuredSerializeOptions, ...args);
//       });
//     },
//   };
// }

export function getAutoConnector<SendData, ReceiveData>({
  id,
  label: labelOption,
  strictTargets = true,
  messagesTypes,
  channel: channelOption,
  logger = log.getLogger('AutoConnector'),
  onSendData,
  onConnect,
}: AutoConnectorOptions<SendData, ReceiveData>): AutoConnector {
  const uid = id || uuid();
  const label = labelOption || uid;
  const msgMap = new Map<string, PartialRecord<keyof MessagesTypes, boolean>>();
  const channelMap =
    channelOption === 'open' ? new Map<string, [MessageChannel, TargetInfo]>() : undefined;

  // let channel: AutoConnector.Channel | MessagePort | undefined;
  let specialTargets: Set<Window> | undefined;
  let disposer: VoidFunction | undefined;

  const post = <M extends IframeMessage>(
    message: M,
    target: MessageEventSource,
    origin: string,
    targetId: string,
    transfer?: Transferable[]
  ): void => {
    if (window === target) return;
    if (isWindowProxy(target)) {
      target.postMessage(message, origin, transfer);
      const targetName = target === window.parent ? 'iframe parent' : 'iframe';
      logger.v1(
        `${`${label}: `}Post message to ${targetName} (uid=${targetId},self.uid=${uid},origin=${origin}):`,
        message
      );
    } else {
      target.postMessage(message, transfer && { transfer });
      logger.v1(
        `${`${label}: `}Post message to MessageEventSource (uid=${targetId},self.uid=${uid}):`,
        message
      );
    }
  };

  const sendPing = (target: MessageEventSource, origin: string, targetId: string): void => {
    post<IframeMessage<'Ping'>>({ uid, type: messagesTypes.Ping }, target, origin, targetId);
  };

  const sendReady = (
    data: unknown,
    target: Window,
    origin: string,
    targetId: string,
    port: MessagePort | undefined
  ): void => {
    post<IframeDataMessage<'SelfReady', unknown>>(
      { uid, type: messagesTypes.SelfReady, data },
      target,
      origin,
      targetId,
      port ? [port] : undefined
    );
  };

  const onReceiveMessage = (message: MessageEvent): void => {
    if (!message.source || message.source === window) {
      return;
    }
    if (
      !isPingMessage(message.data, messagesTypes) &&
      !isTargetReadyMessage(message.data, messagesTypes)
    ) {
      return;
    }
    if (message.data.uid === uid) {
      return;
    }

    const target = message.source as Window;
    const targetId = message.data.uid;

    logger.v1(
      `${`${label}: `}Receive message from iframe (uid=${targetId},self.uid=${uid},origin=${message.origin}):`,
      message.data
    );

    if (strictTargets && specialTargets && !specialTargets.has(target)) {
      logger.v1(
        `${`${label}: `}Could not find target (uid=${targetId},self.uid=${uid}) by message.source.`
      );
      return;
    }

    const origin = getOriginFromMessage(message);
    // console.log(label, { ...msgMap.get(targetId) });

    // Ping from iframe
    if (isPingMessage(message.data, messagesTypes) && !msgMap.get(targetId)?.Ping) {
      msgMap.set(targetId, { ...msgMap.get(targetId), Ping: true });
      sendPing(target, origin, targetId);
      return;
    }

    // In order to wait messages queue in target before call `onConnect`.
    let needAsync = false;

    // Ping or Ready from iframe
    if (msgMap.get(targetId)?.Ping && !msgMap.get(targetId)?.SelfReady) {
      msgMap.set(targetId, { ...msgMap.get(targetId), SelfReady: true });

      // if (!channel && channelMap) {
      //   channel = createChannelProxy(channelMap);
      // }

      const targetInfo: TargetInfo = { target, origin };

      const port2 = channelMap
        ? (() => {
            const messageChannel = channelMap.get(targetId)?.[0] ?? new MessageChannel();
            channelMap.set(targetId, [messageChannel, targetInfo]);
            return messageChannel.port2;
          })()
        : undefined;

      sendReady(onSendData ? onSendData(targetInfo) : undefined, target, origin, targetId, port2);
      needAsync = false;
      // return;
    }

    // Ready from iframe
    if (
      isTargetReadyMessage<ReceiveData>(message.data, messagesTypes) &&
      msgMap.get(targetId)?.SelfReady
    ) {
      // Reset state for target
      msgMap.delete(targetId);
      specialTargets?.delete(target);

      const port = (() => {
        if (channelOption === 'open') {
          const port1 = channelMap?.get(targetId)?.[0].port1;
          if (!port1)
            throw new Error(
              'Something went wrong: MessageChannel is not created despite the fact that the `channel` option is `open`.'
            );
          return port1;
        }
        if (channelOption === 'use') {
          const port2 = message.ports[0];
          if (!port2)
            throw new Error(
              'MessagePort is not received despite the fact that the `channel` option is `use`. The `channel` option of connector on another side must be equals `open`.'
            );
          return port2;
        }
        return undefined;
      })();

      const { data } = message.data;
      const complete = (): void => {
        logger.v1(`${`${label}: `}Connection established (self.uid=${uid} + uid=${targetId}).`);
        onConnect({ data, target, origin }, port as MessagePort);
        // if (channelOption === 'open') {
        //   const port1 = channelMap?.get(targetId)?.port1;
        //   if (!port1) throw new Error();
        //   onConnect({ data, target, origin }, port1);
        // } else if (channelOption === 'use') {
        //   onConnect({ data, target, origin }, channel as MessagePort);
        // } else if (!channelOption) {
        //   onConnect({ data, target, origin });
        // }
      };
      if (needAsync) setTimeout(complete, 0);
      else complete();
    }
  };

  const stop = (): void => {
    if (disposer) {
      disposer();
      disposer = undefined;
    }
  };

  const start: AutoConnector['start'] = (targets, options = {}): void => {
    if (disposer && !options.append) {
      logger.warn(`${`${label}: `}Already started. You should first call \`stop\`.`);
      return;
    }

    if (options.append) {
      const prevSpecialTargets = specialTargets;
      stop();
      specialTargets = prevSpecialTargets;
    }

    // Init and send ping to iframes
    const ready = (): void => {
      const newTargets = (() => {
        const list = typeof targets === 'function' ? targets() : targets;
        return list.length > 0 ? list : undefined;
      })();
      const newWindows = newTargets && readTargets(newTargets);
      if (!newWindows) return;
      const newWindowsSet = new Set(newWindows);

      if (options.append) {
        if (!specialTargets) {
          specialTargets = new Set();
        }
        newWindowsSet.forEach((w) => specialTargets!.add(w));
      } else {
        specialTargets = newWindowsSet;
      }

      window.addEventListener('message', onReceiveMessage);

      const frameSet = options.append ? newWindowsSet : specialTargets;
      frameSet.forEach((frameWindow) => {
        if (frameWindow !== window) sendPing(frameWindow, '*', '');
      });
    };

    const cancel = typeof targets === 'function' ? onDOMReady(ready) : ready();

    disposer = () => {
      if (cancel) cancel();
      window.removeEventListener('message', onReceiveMessage);
      specialTargets = undefined;
    };
  };

  const close = (targets: ArrayLike<Target> | Set<Window>): void => {
    const set = targets instanceof Set ? targets : new Set(readTargets(targets));
    if (set.size === 0) return;
    if (channelMap) {
      channelMap.forEach(([ch, targetInfo], targetId) => {
        if (set.has(targetInfo.target)) {
          ch.port1.close();
          ch.port2.close();
          channelMap.delete(targetId);
        }
      });
    }
    if (specialTargets) {
      const list = specialTargets;
      set.forEach((t) => list.delete(t));
    }
  };

  return {
    start,
    stop,
    isStarted: () => !!disposer,
    // getChannel: () => {
    //   if (!channel) {
    //     if (channelOption === 'use')
    //       throw new Error('Channel is unavailable. Maybe the connector is not connected yet.');
    //     else
    //       throw new Error(
    //         'Channel is unavailable. In order to use channel the option `channel` must be one of `open`, `use`.'
    //       );
    //   }
    //   return channel;
    // },
    close,
    destroy: () => {
      stop();
      msgMap.clear();
      // if (channel) {
      //   channel.close();
      //   channel = undefined;
      // }
      if (channelMap) {
        channelMap.forEach(([ch]) => {
          ch.port1.close();
          // ch.port1.onmessage = null;
          // ch.port1.onmessageerror = null;
          ch.port2.close();
          // ch.port2.onmessage = null;
          // ch.port2.onmessageerror = null;
        });
        channelMap.clear();
      }
    },
    [Symbol.dispose](): void {
      this.destroy();
    },
  };
}
