declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var TelegramWebviewProxy: AnyObject | undefined;
}

export function isTelegramWebView(): boolean {
  return !!window.TelegramWebviewProxy;
}
