import ReconnectingWebSocket, {
  type ErrorEvent,
  type Message,
  type Options as BaseOptions,
  type UrlProvider,
} from 'reconnecting-websocket';
import DataEventEmitter, {
  type DataEventListener,
  type DataEventMap,
} from '@jstoolkit/utils/DataEventEmitter';
import delayed from '@jstoolkit/utils/delayed';

function getNotConnectedError(): Error {
  return new Error('The object is not connected yet.');
}

export class WSController<TData = unknown> extends DataEventEmitter<
  WSController.EventMap<TData>,
  WSController<TData>
> {
  // eslint-disable-next-line class-methods-use-this
  get Events(): typeof WSController.Events {
    return WSController.Events;
  }

  readonly logger: NonNullable<WSController.Options['logger']>;
  protected readonly ws: ReconnectingWebSocket;
  private readonly reconnectOnIdle: delayed.Func<VoidFunction> | undefined;
  private readonly reconnectOnHalfOpen: delayed.Func<VoidFunction> | undefined;
  private closeInvoked = false;

  constructor(url: UrlProvider, options?: WSController.Options | undefined) {
    super();
    const { logger, protocols, binaryType, idleTimeout, halfOpenDetection, startClosed, ...rest } =
      options ?? {};

    this.logger = logger ?? console;

    this.ws = new ReconnectingWebSocket(url, protocols, {
      ...(rest as BaseOptions),
      startClosed: true,
    });

    if (binaryType != null) {
      this.ws.binaryType = binaryType;
    }

    if (idleTimeout && idleTimeout > 0) {
      this.reconnectOnIdle = delayed(() => {
        this.logger.debug(`WS connection reconnecting after ${idleTimeout}ms due to inactivity.`);
        this.ws.reconnect();
      }, idleTimeout);
    }

    this.ws.onopen = () => {
      this.emit(this.Events.Connected);
    };

    this.ws.onclose = ({ code }) => {
      this.reconnectOnIdle?.cancel();
      if (
        options?.maxRetries != null &&
        this.ws.readyState === this.ws.CLOSED &&
        this.ws.retryCount === options.maxRetries
      ) {
        // Without this call ws will constantly try to reconnect
        this.close(code, `Failed to connect after ${options.maxRetries} attempts.`);
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.reconnectOnIdle && this.reconnectOnIdle();
      this.emit(this.Events.Message, event);
    };

    this.ws.onerror = ({ error, message }: ErrorEvent) => {
      this.emit(this.Events.Error, { error, message });
    };

    if (halfOpenDetection) {
      const {
        pingTimeout = 12_000,
        outMessage = () => JSON.stringify({ type: 'pong' }),
        inMessageFilter = (message: any) => message.type === 'ping', // eslint-disable-line @typescript-eslint/no-unsafe-member-access
      } = halfOpenDetection;

      const reconnectOnHalfOpen = delayed(() => {
        this.logger.debug(
          `WS connection reconnecting after ${pingTimeout}ms due to the probability of a half-open connection.`
        );
        this.ws.reconnect();
      }, pingTimeout);
      this.reconnectOnHalfOpen = reconnectOnHalfOpen;

      const heartbeat = (): void => {
        // console.log('heartbeat');
        onClose();
        // pingTimer = window.setTimeout(() => this.ws.reconnect(), pingTimeout);
        reconnectOnHalfOpen();
        this.ws.send(
          typeof outMessage === 'function' && !(outMessage instanceof Blob)
            ? outMessage()
            : outMessage
        );
      };

      const onClose = (): void => reconnectOnHalfOpen.cancel();

      const onMessage = ({ data }: MessageEvent): void => {
        inMessageFilter(data) && heartbeat();
      };

      this.ws.addEventListener('open', heartbeat);
      this.ws.addEventListener('close', onClose);
      this.ws.addEventListener('message', onMessage);

      const closeOrigin = this.ws.close.bind(this.ws);
      this.ws.close = (...args) => {
        closeOrigin(...args);
        this.ws.removeEventListener('open', heartbeat);
        this.ws.removeEventListener('close', onClose);
        this.ws.removeEventListener('message', onMessage);
      };

      if (this.isConnected() || this.ws.readyState === this.ws.CONNECTING) {
        heartbeat();
      }
    }

    if (!startClosed) {
      this.ws.reconnect();
    }
  }

  isConnected(): boolean {
    return this.ws.readyState === this.ws.OPEN;
  }

  getUrl(): string {
    return this.ws.url;
  }

  connect(): void {
    this.close();
    this.closeInvoked = false;
    this.ws.reconnect();
  }

  send(data: Message): void {
    if (!this.ws) throw getNotConnectedError();
    this.ws.send(data);
  }

  close(code?: number | undefined, reason?: string | undefined): void {
    if (this.closeInvoked) return;
    this.closeInvoked = true;
    const hasWS = !!this.ws;
    try {
      if (this.reconnectOnIdle) {
        this.reconnectOnIdle.cancel();
      }
      if (this.reconnectOnHalfOpen) {
        this.reconnectOnHalfOpen.cancel();
      }
      this.ws.close(code, reason);
    } catch (ex) {
      this.logger.warn(ex);
    }
    hasWS && this.emit(this.Events.Closed, reason ? { reason } : undefined);
  }

  destroy(): void {
    this.close();
    this.ws.onopen = null;
    this.ws.onclose = null;
    this.ws.onmessage = null;
    this.ws.onerror = null;
    this.removeAllListeners();
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace WSController {
  export interface Options
    extends OptionalToUndefined<BaseOptions & Partial<Pick<WebSocket, 'binaryType'>>> {
    readonly protocols?: ConstructorParameters<typeof ReconnectingWebSocket>['1'] | undefined;
    /** Reconnecting after an idle timeout (no message events). Default 30_000. */
    readonly idleTimeout?: number | undefined;
    readonly logger?: Pick<Console, 'warn' | 'debug'> | undefined;
    readonly halfOpenDetection?: {
      /** Delay should be equal to the interval at which your server sends out pings plus a conservative assumption of the latency. */
      readonly pingTimeout?: number;
      readonly outMessage?: Message | (() => Message);
      /** Returns `true` if inMessage is ping message. */
      readonly inMessageFilter?: (message: any) => boolean;
    };
  }

  export enum Events {
    Connected = 'Connected',
    Message = 'Message',
    Error = 'Error',
    /** If connection was closed and the object will not to try to reconnect */
    Closed = 'Closed',
  }

  export type EventMap<TData = unknown> = DataEventMap<
    DefineAll<
      Events,
      {
        [Events.Connected]: [];
        [Events.Message]: [
          event: OmitStrict<MessageEvent<TData>, keyof Event | 'initMessageEvent'>
        ];
        [Events.Error]: [event: Pick<ErrorEvent, 'error' | 'message'>];
        [Events.Closed]: [{ readonly reason: string } | undefined];
      }
    >,
    WSController<TData>
  >;

  export type EventHandler<T extends Events = Events, TData = unknown> = DataEventListener<
    EventMap<TData>,
    T,
    WSController<TData>
  >;
}
