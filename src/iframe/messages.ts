export const IFRAME_PING = '@_IFRAME_PING';
export const IFRAME_HOST_READY = '@_IFRAME_HOST_READY';
export const IFRAME_CLIENT_READY = '@_IFRAME_CLIENT_READY';

export type MessagesTypes = {
  readonly Ping: string;
  readonly TargetReady: string;
  readonly SelfReady: string;
  // readonly ClientReady: string;
  // readonly HostReady: string;
};

export function getHostMessages(): MessagesTypes {
  return {
    Ping: IFRAME_PING,
    SelfReady: IFRAME_HOST_READY,
    TargetReady: IFRAME_CLIENT_READY,
  };
}

export function getClientMessages(): MessagesTypes {
  return {
    Ping: IFRAME_PING,
    SelfReady: IFRAME_CLIENT_READY,
    TargetReady: IFRAME_HOST_READY,
  };
}

export interface IframeMessage<T extends keyof MessagesTypes = keyof MessagesTypes> {
  readonly uid: string;
  readonly type: MessagesTypes[T];
}

export interface IframeDataMessage<T extends keyof MessagesTypes = keyof MessagesTypes, D = unknown>
  extends IframeMessage<T> {
  readonly data: D;
}

// export type IframePingMessage = IframeMessage<'Ping'>;

// export interface IframeHostReadyMessage<T> extends IframeDataMessage<'HostReady', T> {}

// export interface IframeClientReadyMessage<T> extends IframeDataMessage<'ClientReady', T> {}

// export function isIframeMessage<T extends keyof MessagesTypes>(
//   data: unknown,
//   validType: T
// ): data is IframeMessage<T> {
//   return !!data && (data as IframeMessage<T>).type === validType;
// }

// export function isIframeDataMessage<T extends string, D>(
//   data: unknown,
//   validType: T
// ): data is IframeDataMessage<T, D> {
//   return !!data && (data as IframeDataMessage<T, D>).type === validType;
// }

export function isPingMessage(
  data: unknown,
  messagesTypes: MessagesTypes
): data is IframeMessage<'Ping'> {
  return !!data && (data as IframeMessage).type === messagesTypes.Ping;
}

export function isTargetReadyMessage<T>(
  data: unknown,
  messagesTypes: MessagesTypes
): data is IframeDataMessage<'TargetReady', T> {
  return !!data && (data as IframeDataMessage).type === messagesTypes.TargetReady;
}

// export function isHostReadyMessage<T>(
//   data: unknown,
//   messagesTypes: MessagesTypes
// ): data is IframeDataMessage<'HostReady', T> {
//   return !!data && (data as IframeDataMessage).type === messagesTypes.HostReady;
// }

// export function isClientReadyMessage<T>(
//   data: unknown,
//   messagesTypes: MessagesTypes
// ): data is IframeDataMessage<'ClientReady', T> {
//   return !!data && (data as IframeDataMessage).type === messagesTypes.ClientReady;
// }
