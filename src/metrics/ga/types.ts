export interface GTMEventData {
  event: string;
}

interface GTMDataLayer<D extends GTMEventData> {
  push(data: D): unknown;
}

interface GTagEventData {
  event_category: string;
  event_label: string | undefined;
  value: number | undefined;
  send_to: string | undefined;
}

type GTagParams = [type: 'event', event: string, data: GTagEventData];

// interface GAObjectEventData {
//   hitType: 'event';
//   eventCategory: string;
//   eventAction: string;
//   eventLabel: string | undefined;
//   eventValue: number | undefined;
// }

// type GACommandParams = [command: 'send', data: GAObjectEventData];

// interface GATracker {
//   get(field: string): unknown;
//   send(data: GAObjectEventData): void;
// }

// interface GAObject {
//   readonly loaded?: boolean | undefined;
//   getAll(): GATracker[];
//   (...params: GACommandParams): void;
//   (readyCallback: VoidFunction): void;
// }

declare global {
  interface Window {
    // /** Universal Analytics object name, default `ga`. */
    // GoogleAnalyticsObject?: string | undefined;
    // /** Universal Analytics without gtag. */
    // ga?: GAObject | undefined;
    /** Google tag */
    gtag?: ((...params: GTagParams) => void) | undefined;
    /** Google Tag Manager */
    dataLayer?: GTMDataLayer<GTMEventData> | undefined;
  }
}
