import { UnreachableCaseError } from '@js-toolkit/utils/UnreachableCaseError';
import type { GTMEventData } from './types';

export interface GAEventData {
  readonly eventCategory: string;
  readonly action: string;
  readonly label: string | undefined;
  /**
   * Идентификатор потока данных
   * (https://support.google.com/analytics/answer/12270356?hl=ru).
   *
   * Можно не указывать, если:
   * - используется Google Tag Manager (gtm.js) с настроенным тегом, в котором самостоятельно указан идентификатор потока данных.
   * - используется Google Tag (gtag.js) с указанным идентификатором потока данных по умолчанию.
   */
  readonly measurementId: string | undefined;
}

export interface GAIFrameMessage<T extends string = string, D extends GAEventData = GAEventData> {
  type: T;
  event: D;
}

export interface GADataHandler<D extends GAEventData> {
  (data: D): void;
}

type GALibType = 'gtm' | 'gtag' | /* 'ga' | */ 'iframe' | 'auto';

export type GAEventDataTransformer<
  D extends GAEventData,
  L extends Extract<GALibType, 'gtm' | 'iframe'>,
> = (data: D) => {
  readonly gtm: GTMEventData;
  // readonly gtag: GTagEventData;
  // readonly ga: GAObjectEventData;
  readonly iframe: GAIFrameMessage<string, D>;
}[L];

/** Google Tag Manager handler */
function gtmHandler<D extends GAEventData>(
  gtm: NonNullable<Window['dataLayer']>,
  transform: GAEventDataTransformer<D, 'gtm'>,
  data: D
): void {
  gtm.push(transform(data));
}

/** Google tag handler */
function gtagHandler<D extends GAEventData>(gtag: NonNullable<Window['gtag']>, data: D): void {
  const { action, eventCategory, measurementId, label } = data;
  gtag('event', action, {
    send_to: measurementId,
    event_category: eventCategory,
    event_label: label,
    value: undefined,
  });
}

function iframeHandler<T extends string, D extends GAEventData>(type: T, data: D): void {
  window.parent.postMessage({ type, event: data } as GAIFrameMessage, '*');
}

// /** Universal Analytics without gtag handler */
// function gaHandler<D extends GAEventData>(
//   gaObjectName: string,
//   trackerCache: Record<string, GATracker>,
//   data: D
// ): void {
//   const ga = window[gaObjectName as 'ga'];
//   if (!ga) return;

//   const { action, eventCategory, measurementId, label } = data;
//   const gaData: GAObjectEventData = {
//     hitType: 'event',
//     eventCategory,
//     eventAction: action,
//     eventLabel: label,
//     eventValue: undefined,
//   };

//   if (measurementId) {
//     const send = (): void => {
//       const tracker =
//         trackerCache[measurementId] ?? ga.getAll().find((t) => t.get('measurementId') === measurementId);
//       if (!tracker) return;
//       // eslint-disable-next-line no-param-reassign
//       trackerCache[measurementId] = tracker;
//       tracker.send(gaData);
//     };
//     if (ga.loaded) send();
//     else ga(send);
//   } else {
//     ga('send', gaData);
//   }
// }

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

      // if (
      //   (window.GoogleAnalyticsObject && window[window.GoogleAnalyticsObject as 'ga']) ||
      //   window.ga
      // )
      //   return getHandler('ga', undefined);

      if (window.dataLayer)
        return getHandler('gtm', transformers as GAEventDataTransformerMap<D, 'gtm'>);

      if (window.parent !== window)
        return getHandler('iframe', transformers as GAEventDataTransformerMap<D, 'iframe'>);

      return undefined;
    }
    case 'iframe': {
      return (data) => {
        const msg = (transformers as GAEventDataTransformerMap<D, 'iframe'>).iframe(data);
        iframeHandler(msg.type, msg.event);
      };
    }
    case 'gtm': {
      const { dataLayer } = window;
      if (!dataLayer) return undefined;
      return (data) => {
        gtmHandler(dataLayer, (transformers as GAEventDataTransformerMap<D, 'gtm'>).gtm, data);
      };
    }
    case 'gtag': {
      return window.gtag ? gtagHandler.bind(undefined, window.gtag) : undefined;
    }
    // case 'ga': {
    //   const propName = window.GoogleAnalyticsObject || 'ga';
    //   const obj = window[propName as 'ga'];
    //   return obj ? gaHandler.bind(undefined, propName, {}) : undefined;
    // }
    default: {
      throw new UnreachableCaseError(gaLib, `Unknown GA lib type '${gaLib}'.`);
    }
  }
}
