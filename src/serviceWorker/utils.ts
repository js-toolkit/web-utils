/// <reference lib="webworker" />

import { getErrorMessage } from '@js-toolkit/utils/getErrorMessage';

/** Delete all caches that aren't named in `caches`. */
export function removeUnknownCaches<T extends Record<string, string>>(
  expectedCaches: T
): Promise<unknown> {
  return caches.keys().then((cacheNames) => {
    const expectedCacheNamesSet = new Set(Object.values(expectedCaches));
    return Promise.all(
      cacheNames.map((cacheName) => {
        if (!expectedCacheNamesSet.has(cacheName)) {
          // If this cache name isn't present in the set of "expected" cache names, then delete it.
          // logger.debug('Deleting out of date cache:', cacheName);
          return caches.delete(cacheName);
        }
        return undefined;
      })
    );
  });
}

export async function addResourcesToCache(
  cacheName: string,
  resources: readonly RequestInfo[]
): Promise<void> {
  const cache = await caches.open(cacheName);
  await cache.addAll(resources);
}

interface CacheFirstOptions extends Pick<FetchEvent, 'request'> {
  readonly fallbackUrl?: string | undefined;
  readonly logger?: Pick<Console, 'error' | 'debug'> | undefined;
  readonly saveToCache?:
    | ((options: { request: Request; response: Response }) => boolean)
    | undefined;
}

export async function cacheFirst(
  cacheName: string,
  { request, fallbackUrl, saveToCache, logger = console }: CacheFirstOptions
): Promise<Response> {
  // First try to get the resource from the cache
  const cache = await caches.open(cacheName);
  const responseFromCache = await cache.match(request);
  if (responseFromCache) {
    logger.debug('Found response in cache:', responseFromCache);
    return responseFromCache;
  }

  // Otherwise, if there is no entry in the cache for `request`, response will be undefined,
  // and we need to fetch() the resource.
  logger.debug('No response for %s found in cache. About to fetch from network...', request.url);

  // Next try to use the preloaded response, if it's there
  // NOTE: Chrome throws errors regarding preloadResponse, see:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1420515
  // https://github.com/mdn/dom-examples/issues/145
  // To avoid those errors, remove or comment out this block of preloadResponse
  // code along with enableNavigationPreload() and the "activate" listener.
  // const preloadResponseValue = await preloadResponse;
  // if (preloadResponseValue) {
  //   logger.info('using preload response', preloadResponseValue);
  //   putInCache(request, preloadResponseValue.clone());
  //   return preloadResponseValue;
  // }

  // Next try to get the resource from the network
  // We call .clone() on the request since we might use it in a call to cache.put() later on.
  // Both fetch() and cache.put() "consume" the request, so we need to make a copy.
  // (see https://fetch.spec.whatwg.org/#dom-request-clone)
  try {
    const response = await fetch(request.clone());
    logger.debug('Response for %s from network is: %O', request.url, response);
    // This avoids caching responses that we know are errors (i.e. HTTP status code of 4xx or 5xx).
    if (response.status < 400 && (!saveToCache || saveToCache({ request, response }))) {
      // We call .clone() on the response to save a copy of it to the cache. By doing so, we get to keep
      // the original response object which we will return back to the controlled page.
      // (see https://fetch.spec.whatwg.org/#dom-response-clone)
      logger.debug('Caching the response to', request.url);
      cache.put(request, response.clone()).catch((error: unknown) => {
        logger.error(
          getErrorMessage(new Error(`Caching error of ${request.url}`, { cause: error }))
        );
      });
    } else {
      logger.debug('Not caching the response to', request.url);
    }
    return response;
  } catch (error) {
    const fallbackResponse = fallbackUrl && (await cache.match(fallbackUrl));
    if (fallbackResponse) {
      return fallbackResponse;
    }
    // This catch() will handle exceptions that arise from the match() or fetch() operations.
    // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
    // It will return a normal response object that has the appropriate error code set.
    logger.error('Error in fetch handler:', error);
    throw error;
  }
}
