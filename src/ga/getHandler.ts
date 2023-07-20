import iframeMessenger, { type GAEventMessage } from './iframeMessenger';
import './types';

export interface GAEventData {
  eventCategory: string;
  action: string;
  label: string | undefined;
  trackingId: string | undefined;
}

export interface GADataHandler<D extends GAEventData> {
  (data: D): void;
}

type GALibType = 'gtm' | 'gtag' | 'ga' | 'iframe' | 'auto';

export type GAEventDataTransformer<
  D extends GAEventData,
  L extends Extract<GALibType, 'gtm' | 'iframe'>,
> = (data: D) => {
  gtm: GTMEventData;
  // gtag: GTagEventData;
  // ga: GAObjectEventData;
  iframe: GAEventMessage<string, D>;
}[L];

/** Google Tag Manager handler */
function gtmHandler<D extends GAEventData>(
  gtm: NonNullable<Window['dataLayer']>,
  transformer: GAEventDataTransformer<D, 'gtm'>,
  data: D
): void {
  gtm.push(transformer(data));
}

/** Universal Analytics with gtag handler */
function gtagHandler<D extends GAEventData>(gtag: NonNullable<Window['gtag']>, data: D): void {
  const { action, eventCategory, trackingId, label } = data;

  gtag('event', action, {
    send_to: trackingId,
    event_category: eventCategory,
    event_label: label,
    value: undefined,
  });
}

/** Universal Analytics without gtag handler */
function gaHandler<D extends GAEventData>(
  gaObjectName: string,
  trackerCache: Record<string, GATracker>,
  data: D
): void {
  const ga = window[gaObjectName as 'ga'];
  if (!ga) return;

  const { action, eventCategory, trackingId, label } = data;
  const gaData: GAObjectEventData = {
    hitType: 'event',
    eventCategory,
    eventAction: action,
    eventLabel: label,
    eventValue: undefined,
  };

  if (trackingId) {
    const send = (): void => {
      const tracker =
        trackerCache[trackingId] ?? ga.getAll().find((t) => t.get('trackingId') === trackingId);
      if (!tracker) return;
      // eslint-disable-next-line no-param-reassign
      trackerCache[trackingId] = tracker;
      tracker.send(gaData);
    };
    if (ga.loaded) send();
    else ga(send);
  } else {
    ga('send', gaData);
  }
}

export type GAEventDataTransformerMap<
  D extends GAEventData,
  L extends Extract<GALibType, 'gtm' | 'iframe'> = Extract<GALibType, 'gtm' | 'iframe'>,
> = L extends L ? Record<L, GAEventDataTransformer<D, L>> : never;

export function getHandler<D extends GAEventData, L extends GALibType>(
  gaLib: L,
  transformers: L extends 'auto' | 'gtm' | 'iframe' ? GAEventDataTransformerMap<D> : undefined
): GADataHandler<D> | undefined {
  switch (gaLib) {
    case 'auto': {
      if (window.gtag) return getHandler('gtag', undefined);

      if (
        (window.GoogleAnalyticsObject && window[window.GoogleAnalyticsObject as 'ga']) ||
        window.ga
      )
        return getHandler('ga', undefined);

      if (window.dataLayer)
        return getHandler('gtm', transformers as GAEventDataTransformerMap<D, 'gtm'>);

      if (window.parent !== window)
        return getHandler('iframe', transformers as GAEventDataTransformerMap<D, 'iframe'>);

      return undefined;
    }
    case 'iframe': {
      return (data) => {
        const msg = (transformers as GAEventDataTransformerMap<D, 'iframe'>).iframe(data);
        iframeMessenger(msg.type, msg.event);
      };
    }
    case 'gtm': {
      const { dataLayer } = window;
      return dataLayer
        ? (data) => {
            gtmHandler(dataLayer, (transformers as GAEventDataTransformerMap<D, 'gtm'>).gtm, data);
          }
        : undefined;
    }
    case 'gtag': {
      return window.gtag ? gtagHandler.bind(undefined, window.gtag) : undefined;
    }
    case 'ga': {
      const propName = window.GoogleAnalyticsObject || 'ga';
      const obj = window[propName as 'ga'];
      return obj ? gaHandler.bind(undefined, propName, {}) : undefined;
    }
    default: {
      throw new Error(`Unknown GA lib type '${gaLib as string}'.`);
    }
  }
}

export default getHandler;
