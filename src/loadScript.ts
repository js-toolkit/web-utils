/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { onDOMReady } from './onDOMReady';

export interface LoadScriptOptions
  extends Partial<Pick<HTMLScriptElement, 'id' | 'async' | 'defer'>> {
  keepScript?: boolean | undefined;
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

export function loadScript(
  url: string,
  { keepScript, id, async = true, defer = false }: LoadScriptOptions = {},
  isExecuted: (() => boolean) | undefined = undefined
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    onDOMReady(() => {
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
      } catch (ex) {
        reject(ex);
      }
    });
  });
}
