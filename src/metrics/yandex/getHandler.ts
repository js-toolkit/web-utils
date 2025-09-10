import { UnreachableCaseError } from '@js-toolkit/utils/UnreachableCaseError';
import type { YTMEventData } from './types';

export type YMEventData = AnyObject;

export interface YaIFrameMessage<T extends string = string, D extends YMEventData = YMEventData> {
  type: T;
  event: D;
}

export interface YaDataHandler<D extends YMEventData> {
  (data: D): void;
}

export type YaLibType = 'ym' | 'ytm' | 'iframe' | 'auto';

type YAEventDataTransformer<
  D extends YMEventData,
  L extends ExtractStrict<YaLibType, 'ytm' | 'ym' | 'iframe'>,
> = (data: D) => {
  ytm: YTMEventData;
  ym:
    | [counterId: string, fn: 'reachGoal', target: string, params: AnyObject]
    | [counterId: string, fn: 'params', params: AnyObject];
  iframe: YaIFrameMessage<string, D>;
}[L];

export type YAEventDataTransformerMap<
  D extends YMEventData,
  L extends ExtractStrict<YaLibType, 'ytm' | 'ym' | 'iframe'> = 'ytm' | 'ym' | 'iframe',
> = L extends L ? Record<L, YAEventDataTransformer<D, L>> : never;

/** Yandex Tag Manager handler */
function ytmHandler<D extends YMEventData>(
  ytm: NonNullable<Window['dataLayer']>,
  transform: YAEventDataTransformer<D, 'ytm'>,
  data: D
): void {
  // https://yandex.ru/support/tag-manager/ru/triggers/types#special-event-trigger-type
  ytm.push(transform(data));
}

function ymHandler<D extends YMEventData>(
  ym: NonNullable<Window['ym']>,
  transform: YAEventDataTransformer<D, 'ym'>,
  data: D
): void {
  // counterId.forEach((item) => ym(typeof item === 'string' ? item : item.id, 'params', data));
  const [counterId, fn, ...rest] = transform(data);
  ym(counterId, fn, ...rest);
}

function iframeHandler<T extends string, D extends YMEventData>(type: T, data: D): void {
  window.parent.postMessage({ type, event: data } as YaIFrameMessage, '*');
}

export function getHandler<D extends YMEventData, L extends YaLibType>(
  yaLib: L,
  transformers: YAEventDataTransformerMap<D>
): YaDataHandler<D> {
  switch (yaLib) {
    case 'auto': {
      if (window.ym) return getHandler('ym', transformers as YAEventDataTransformerMap<D, 'ym'>);

      if (window.dataLayer)
        return getHandler('ytm', transformers as YAEventDataTransformerMap<D, 'ytm'>);

      if (window.parent !== window)
        return getHandler('iframe', transformers as YAEventDataTransformerMap<D, 'iframe'>);

      throw new Error(
        'Unable to create auto handler due to Yandex Metrics is not configured or current window is not inside iframe.'
      );
    }
    case 'iframe': {
      return (data) => {
        const msg = (transformers as YAEventDataTransformerMap<D, 'iframe'>).iframe(data);
        iframeHandler(msg.type, msg.event);
      };
    }
    case 'ytm': {
      const { dataLayer } = window;
      if (!dataLayer) throw new Error('Unable to create handler: `dataLayer` is undefined.');
      return (data) => {
        ytmHandler(dataLayer, (transformers as YAEventDataTransformerMap<D, 'ytm'>).ytm, data);
      };
    }
    case 'ym': {
      // const { ym, Ya } = window;
      // if (!ym || !Ya) throw new Error('Unable to create handler: `ym` or `Ya` is undefined.');
      // const getCounters =
      //   // eslint-disable-next-line no-underscore-dangle
      //   Ya.Metrica2?.counters.bind(Ya.Metrica2) || Ya._metrica?.getCounters.bind(Ya._metrica);
      // if (!getCounters) throw new Error('Unable to create handler: counters getter is undefined.');
      // return (data) => {
      //   ymHandler(ym, data, data.measurementId ? [data.measurementId] : getCounters());
      // };
      const { ym } = window;
      if (!ym) throw new Error('Unable to create handler: `ym` is undefined.');
      return (data) => {
        ymHandler(ym, (transformers as YAEventDataTransformerMap<D, 'ym'>).ym, data);
      };
    }
    default: {
      throw new UnreachableCaseError(yaLib, `Unknown Ya lib type '${yaLib}'.`);
    }
  }
}
