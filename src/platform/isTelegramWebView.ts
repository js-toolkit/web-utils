declare global {
  // eslint-disable-next-line vars-on-top
  var TelegramWebviewProxy: AnyObject | undefined;
}

export function isTelegramWebView(): boolean {
  return !!window.TelegramWebviewProxy;
}
