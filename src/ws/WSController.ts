import ReconnectingWebSocket, {
  ErrorEvent,
  Message,
  Options,
  UrlProvider,
} from 'reconnecting-websocket';
import DataEventEmitter, {
  DataEventListener,
  DataEventMap,
} from '@jstoolkit/utils/DataEventEmitter';
import delayed from '@jstoolkit/utils/delayed';

function getNotConnectedError(): Error {
  return new Error('The object is not connected yet.');
}

export interface WSControllerOptions
  extends OptionalToUndefined<Options & Partial<Pick<WebSocket, 'binaryType'>>> {
  readonly protocols?: ConstructorParameters<typeof ReconnectingWebSocket>['1'] | undefined;
  /** Reconnecting after an idle timeout (no message events). Default 30_000. */
  readonly idleTimeout?: number | undefined;
  readonly logger?: Pick<Console, 'warn' | 'debug'> | undefined;
}

export class WSController<TData = unknown> extends DataEventEmitter<
  WSController.EventMap<TData>,
  WSController<TData>
> {
  // eslint-disable-next-line class-methods-use-this
  get Events(): typeof WSController.Events {
    return WSController.Events;
  }

  readonly logger: NonNullable<WSControllerOptions['logger']>;
  private readonly ws: ReconnectingWebSocket;
  private readonly reconnectOnIdle: delayed.Func<VoidFunction> | undefined;
  private closeInvoked = false;

  constructor(url: UrlProvider, options?: WSControllerOptions | undefined) {
    super();
    const { logger, protocols, binaryType, idleTimeout = 30_000, ...rest } = options ?? {};

    this.logger = logger ?? console;

    const ws = new ReconnectingWebSocket(url, protocols, rest as Options);
    this.ws = ws;

    if (binaryType != null) {
      ws.binaryType = binaryType;
    }

    if (idleTimeout && idleTimeout > 0) {
      this.reconnectOnIdle = delayed(() => {
        this.logger.debug(`WS connection reconnecting after ${idleTimeout}ms due to inactivity.`);
        ws.reconnect();
      }, idleTimeout);
    }

    ws.onopen = () => {
      this.emit(this.Events.Connected);
    };

    ws.onclose = ({ code }) => {
      this.reconnectOnIdle?.cancel();
      if (
        options?.maxRetries != null &&
        ws.readyState === ws.CLOSED &&
        ws.retryCount === options.maxRetries
      ) {
        // Without this call ws will constantly try to reconnect
        this.close(code, `Failed to connect after ${options.maxRetries} attempts.`);
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      this.reconnectOnIdle && this.reconnectOnIdle();
      this.emit(this.Events.Message, event);
    };

    ws.onerror = ({ error, message }: ErrorEvent) => {
      this.emit(this.Events.Error, { error, message });
    };
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
        // this.reconnectOnIdle = undefined;
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
