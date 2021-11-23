import onDOMReady from './onDOMReady';

export type LoadScriptOptions = Partial<Pick<HTMLScriptElement, 'id' | 'async' | 'defer'>>;

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
  { id, async = true, defer = false }: LoadScriptOptions = {}
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const load = (): void => {
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
      if (id) {
        scriptElement.id = id;
      }
      scriptElement.async = async;
      scriptElement.defer = defer;
      scriptElement.src = url;
      scriptElement.addEventListener('load', () => resolve(), { once: true });
      scriptElement.addEventListener('error', reject, { once: true });
      document.head.appendChild(scriptElement);
    };

    onDOMReady(load);
  });
}
