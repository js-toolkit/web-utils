import { toInt } from '@js-toolkit/utils/toInt';

export interface SecondsCounterOptions {
  readonly onChange?:
    | ((data: {
        /** Current seconds (integer). */
        value: number;
        /** The number of records - total seconds. It's not a duration. (integer). */
        total: number;
      }) => void)
    | undefined;
}

export interface SecondsCounter {
  readonly getTotal: () => number;
  readonly push: (
    currentTime: number | { currentTime: number } | { data: { currentTime: number } }
  ) => void;
  onChange: SecondsCounterOptions['onChange'];
  readonly reset: VoidFunction;
  readonly destroy: VoidFunction;
}

export function getSecondsCounter({ onChange }: SecondsCounterOptions = {}): SecondsCounter {
  const timestamps = new Set<number>();
  let listener = onChange;
  let destroyed = false;

  return {
    getTotal() {
      return timestamps.size;
    },
    push(time) {
      if (destroyed) throw new Error('SecondsCounter was destroyed.');
      const currentTime =
        // eslint-disable-next-line no-nested-ternary
        typeof time === 'number'
          ? time
          : 'currentTime' in time
            ? time.currentTime
            : time.data.currentTime;
      if (time == null) return;
      // Add new seconds to list
      const secs = toInt(currentTime);
      if (secs > 0 && !timestamps.has(secs)) {
        timestamps.add(secs);
        listener && listener({ value: secs, total: timestamps.size });
      }
    },
    get onChange() {
      return listener;
    },
    set onChange(value: SecondsCounterOptions['onChange']) {
      listener = value;
    },
    reset() {
      timestamps.clear();
    },
    destroy() {
      destroyed = true;
      listener = undefined;
      this.reset();
    },
  };
}
