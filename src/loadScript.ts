import onDOMReady from './onDOMReady';

export interface LoadScriptOptions
  extends Partial<Pick<HTMLScriptElement, 'id' | 'async' | 'defer'>> {
  keepScript?: boolean | undefined;
}

function isScriptAdded(src: string): boolean {
  const url = src.startsWith('//') ? window.location.protocol + src : src;
  for (let i = 0; i < document.scripts.length; i += 1) {
    if (document.scripts[i].src === url) {
      return true;
    }
  }
  return false;
}

export function loadScript(
  url: string,
  { keepScript, id, async = true, defer = false }: LoadScriptOptions = {}
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    onDOMReady(() => {
      try {
        if (id) {
          if (document.scripts.namedItem(id)) {
            resolve();
            return;
          }
        } else if (isScriptAdded(url)) {
          resolve();
          return;
        }

        const scriptElement = document.createElement('script');

        const done = (): void => {
          scriptElement.removeEventListener('load', onLoad);
          scriptElement.removeEventListener('error', onError);
          if (!keepScript) {
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
              : new Error('Script load error. See previous log messages.');
          reject(ex);
        };

        if (id) {
          scriptElement.id = id;
        }
        scriptElement.async = async;
        scriptElement.defer = defer;
        scriptElement.src = url;

        scriptElement.addEventListener('load', onLoad, { once: true });
        scriptElement.addEventListener('error', onError, { once: true });

        document.head.appendChild(scriptElement);
      } catch (ex) {
        reject(ex);
      }
    });
  });
}
