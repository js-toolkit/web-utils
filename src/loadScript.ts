/* eslint-disable @typescript-eslint/no-use-before-define */
import { onDOMReady } from './onDOMReady';

export interface LoadScriptOptions extends Partial<Pick<HTMLScriptElement, 'id'>> {
  /** Defaults to `true`. */
  async?: boolean | undefined;
  /** Defaults to `false`. */
  defer?: boolean | undefined;
  /** Defaults to `false`. */
  keepScript?: boolean | undefined;
  /** Defaults to `true`. */
  waitDomReady?: boolean | undefined;
}

function findScript(src: string): HTMLScriptElement | undefined {
  const url = src.startsWith('//') ? window.location.protocol + src : src;
  for (let i = 0; i < document.scripts.length; i += 1) {
    if (document.scripts[i].src === url) {
      return document.scripts[i];
    }
  }
  return undefined;
}

function load(
  url: string,
  { id, keepScript, async, defer }: RequiredStrict<OmitStrict<LoadScriptOptions, 'waitDomReady'>>,
  isExecuted: (() => boolean) | undefined,
  resolve: VoidFunction,
  reject: (error: unknown) => void
): void {
  try {
    const addedScript = id ? document.scripts.namedItem(id) : findScript(url);

    if (addedScript && (!isExecuted || isExecuted())) {
      resolve();
      return;
    }

    const scriptElement = addedScript ?? document.createElement('script');

    const done = (): void => {
      scriptElement.removeEventListener('load', onLoad);
      scriptElement.removeEventListener('error', onError);
      if (!keepScript && !addedScript) {
        scriptElement.remove();
      }
    };

    const onLoad = (): void => {
      done();
      resolve();
    };

    const onError = (error: Event): void => {
      done();
      const ex =
        error instanceof ErrorEvent
          ? error
          : new Error(`Unable to load script by url ${url}.`, { cause: error });
      reject(ex);
    };

    // Subscribe in any way because the script may be already added but not executed/loaded yet.
    scriptElement.addEventListener('load', onLoad, { once: true });
    scriptElement.addEventListener('error', onError, { once: true });
    if (!addedScript) {
      if (id) {
        scriptElement.id = id;
      }
      scriptElement.async = async;
      scriptElement.defer = defer;
      scriptElement.src = url;
      document.head.appendChild(scriptElement);
    }
  } catch (error) {
    reject(error);
  }
}

export function loadScript(
  url: string,
  {
    id,
    keepScript = false,
    async = true,
    defer = false,
    waitDomReady = true,
  }: LoadScriptOptions = {},
  isExecuted: (() => boolean) | undefined = undefined
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (waitDomReady) {
      onDOMReady(() => {
        load(url, { id: id ?? '', keepScript, async, defer }, isExecuted, resolve, reject);
      });
    } else {
      load(url, { id: id ?? '', keepScript, async, defer }, isExecuted, resolve, reject);
    }
  });
}
