export const IFRAME_PING = '@_IFRAME_PING';
export const IFRAME_HOST_READY = '@_IFRAME_HOST_READY';
export const IFRAME_CLIENT_READY = '@_IFRAME_CLIENT_READY';

export interface IframeMessage<T extends string> {
  type: T;
}

export type IframePingMessage = IframeMessage<typeof IFRAME_PING>;

export interface IframeHostReadyMessage<T> extends IframeMessage<typeof IFRAME_HOST_READY> {
  readonly data: T;
}

export interface IframeClientReadyMessage<T> extends IframeMessage<typeof IFRAME_CLIENT_READY> {
  readonly data: T;
}

export function isPingMessage(data: unknown): data is IframePingMessage {
  return !!data && (data as IframePingMessage).type === IFRAME_PING;
}

export function isIframeHostReadyMessage<T>(data: unknown): data is IframeHostReadyMessage<T> {
  return !!data && (data as IframeHostReadyMessage<unknown>).type === IFRAME_HOST_READY;
}

export function isIframeClientReadyMessage<T>(data: unknown): data is IframeClientReadyMessage<T> {
  return !!data && (data as IframeClientReadyMessage<unknown>).type === IFRAME_CLIENT_READY;
}
