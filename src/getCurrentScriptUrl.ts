const { currentScript } = document;

export function getCurrentScriptUrl(url?: string | URL): URL {
  return new URL(url ?? '', (currentScript as HTMLScriptElement)?.src);
}
