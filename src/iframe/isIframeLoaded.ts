export interface Options {
  readonly blank?: boolean | undefined;
  readonly complete?: boolean | undefined;
}

export function isIframeLoaded(
  iframe: HTMLIFrameElement,
  { blank, complete }: Options = {}
): boolean {
  if (!iframe.contentDocument) return false;
  const { documentURI, readyState } = iframe.contentDocument;
  return (
    (blank || (!!documentURI && documentURI !== 'about:blank')) &&
    (complete
      ? readyState === 'complete'
      : readyState === 'interactive' || readyState === 'complete')
  );
}
