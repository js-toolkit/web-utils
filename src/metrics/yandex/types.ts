export interface YTMEventData {
  event: string;
}

// interface YTMDataLayer<D extends YTMEventData> {
//   push: (data: D) => unknown;
// }

// interface Ya {
//   Metrica2?: {
//     counters(): { id: string }[];
//   };
//   _metrica?: {
//     getCounters(): { id: string }[];
//   };
// }

interface Ym {
  // (counterId: string, fn: 'params', event: AnyObject): void;
  // (counterId: string, fn: 'reachGoal', target: string, event: AnyObject): void;
  (counterId: string, fn: string, ...rest: unknown[]): void;
}

declare global {
  interface Window {
    // /** Yandex Tag Manager */
    // dataLayer?: YTMDataLayer<YTMEventData> | undefined;
    /** Yandex Metrics */
    ym?: Ym;
    // /** Yandex Api */
    // Ya?: Ya;
  }
}
