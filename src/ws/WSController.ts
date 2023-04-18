import ReconnectingWebSocket, {
  type ErrorEvent,
  type Message,
  type Options as BaseOptions,
  type UrlProvider,
} from 'reconnecting-websocket';
import type { WebSocketEventMap } from 'reconnecting-websocket/dist/events';
import DataEventEmitter, {
  type DataEventListener,
  type DataEventMap,
} from '@jstoolkit/utils/DataEventEmitter';
import delayed from '@jstoolkit/utils/delayed';
import { EventEmitterListener } from '../EventEmitterListener';

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
  private readonly listener: EventEmitterListener<ReconnectingWebSocket, WebSocketEventMap>;
  private readonly reconnectOnIdle: delayed.Func<VoidFunction> | undefined;
  private readonly halfOpen:
    | {
        heartbeat: VoidFunction;
        cancel: VoidFunction;
        onMessage: NonNullable<ReconnectingWebSocket['onmessage']>;
      }
    | undefined;
  // private closeInvoked = false;

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

    this.listener = new EventEmitterListener(this.ws);

    // reconnect on idle
    if (idleTimeout && idleTimeout > 0) {
      this.reconnectOnIdle = delayed(() => {
        this.logger.info(`WS connection reconnecting after ${idleTimeout}ms due to inactivity.`);
        this.ws.reconnect();
      }, idleTimeout);
    }

    // reconnect on half-open
    this.halfOpen = (() => {
      if (!halfOpenDetection) return undefined;

      const {
        pingTimeout = 12_000,
        outMessage = () => JSON.stringify({ type: 'pong' }),
        inMessageFilter = (message) =>
          message && typeof message === 'object' && (message as AnyObject).type === 'ping',
      } = halfOpenDetection;

      const reconnectOnHalfOpen = delayed(() => {
        this.logger.info(
          `WS connection reconnecting after ${pingTimeout}ms due to the probability of a half-open connection.`
        );
        this.ws.reconnect();
      }, pingTimeout);

      const heartbeat = (): void => {
        // console.log('heartbeat');
        reconnectOnHalfOpen();
        this.ws.send(
          typeof outMessage === 'function' && !(outMessage instanceof Blob)
            ? outMessage()
            : outMessage
        );
      };

      const onMessage = ({ data }: MessageEvent): void => {
        if (inMessageFilter(data)) heartbeat();
        else reconnectOnHalfOpen(); // Any message signals that the connection still alive.
      };

      return { heartbeat, cancel: () => reconnectOnHalfOpen.cancel(), onMessage };
    })();

    this.listener
      .on('open', () => {
        this.reconnectOnIdle && this.reconnectOnIdle();
        this.halfOpen?.heartbeat();
        this.emit(this.Events.Connected);
      })
      .on('close', ({ code }) => {
        this.reconnectOnIdle?.cancel();
        this.halfOpen?.cancel();
        if (
          options?.maxRetries != null &&
          this.ws.readyState === this.ws.CLOSED &&
          this.ws.retryCount === options.maxRetries
        ) {
          // Without this call ws will constantly try to reconnect
          this.close(code, `Failed to connect after ${options.maxRetries} attempts.`);
        }
      })
      .on('message', (event: MessageEvent) => {
        this.reconnectOnIdle && this.reconnectOnIdle();
        this.halfOpen?.onMessage(event);
        this.emit(this.Events.Message, event);
      })
      .on('error', ({ error, message }: ErrorEvent) => {
        this.emit(this.Events.Error, { error, message });
      });

    if (this.halfOpen && (this.isConnected() || this.ws.readyState === this.ws.CONNECTING)) {
      this.halfOpen.heartbeat();
    }

    if (!startClosed) {
      this.connect();
    }
  }

  isConnected(): boolean {
    return this.ws.readyState === this.ws.OPEN;
  }

  getUrl(): string {
    return this.ws.url;
  }

  connect(): void {
    // this.close()
    // this.closeInvoked = false;
    this.ws.reconnect();
  }

  send(data: Message): void {
    if (!this.ws) throw getNotConnectedError();
    this.ws.send(data);
  }

  close(code?: number | undefined, reason?: string | undefined): void {
    // if (this.closeInvoked) return;
    // this.closeInvoked = true;
    const hasWS = !!this.ws;
    try {
      if (this.reconnectOnIdle) {
        this.reconnectOnIdle.cancel();
      }
      if (this.halfOpen) {
        this.halfOpen.cancel();
      }
      this.ws.close(code, reason);
    } catch (ex) {
      this.logger.warn(ex);
    }
    hasWS && this.emit(this.Events.Closed, reason ? { reason } : undefined);
  }

  destroy(): void {
    this.close();
    this.listener.removeAllListeners();
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
    readonly logger?: Pick<Console, 'warn' | 'info'> | undefined;
    readonly halfOpenDetection?: {
      /** Delay should be equal to the interval at which your server sends out pings plus a conservative assumption of the latency. */
      readonly pingTimeout?: number;
      readonly outMessage?: Message | (() => Message);
      /** Returns `true` if inMessage is ping message. */
      readonly inMessageFilter?: (message: unknown) => boolean;
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
