import { onPageReady } from '../onPageReady';

export function getNavigationTiming(): Promise<PerformanceNavigationTiming | undefined> {
  return new Promise((resolve) => {
    onPageReady(() =>
      setTimeout(() => {
        try {
          const navigationEntry = window.performance?.getEntriesByType('navigation')[0];
          resolve(navigationEntry as PerformanceNavigationTiming);
        } catch {
          resolve(undefined);
        }
      }, 0)
    );
  });
}
