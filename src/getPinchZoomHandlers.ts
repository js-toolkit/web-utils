import { preventDefault } from './preventDefault';

type TouchLike = Pick<Touch, 'pageX' | 'pageY' | 'clientX' | 'clientY'>;

type TouchListLike = ArrayLike<TouchLike>;

type TouchEventLike = Override<
  Pick<TouchEvent, 'touches' | 'preventDefault' | 'stopPropagation'>,
  { touches: TouchListLike }
> & { readonly scale?: number };

type ActionType = 'zoom' | 'move';

interface PinchZoomHandlers<E extends TouchEventLike = TouchEventLike> {
  onTouchStart: (event: E) => void;
  onTouchMove: (event: E) => void;
  onTouchEnd: (event: E) => void;
  getState: () => ActionType | undefined;
  // isChanged: () => boolean;
}

// Calculate distance between two fingers
function getDistanceBetweenFingers(touch1: TouchLike, touch2: TouchLike): number {
  return Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
}

function getPoint(touch1: TouchLike, touch2?: TouchLike): Point {
  if (!touch2) {
    return { x: touch1.pageX, y: touch1.pageY };
  }
  return {
    x: (touch1.pageX + touch2.pageX) / 2,
    y: (touch1.pageY + touch2.pageY) / 2,
  };
}

export interface GetPinchZoomHandlersOptions<E extends TouchEventLike = TouchEventLike> {
  canStart: (action: ActionType, event: E) => boolean;
  onUpdate: (deltaScale: number, deltaOffsetX: number, deltaOffsetY: number) => void;
  onEnd: (x?: number, y?: number) => void;
  getBounds?: () => [target: DOMRect, bounds: DOMRect];
  acceleration?: number;
}

export function getPinchZoomHandlers<E extends TouchEventLike = TouchEventLike>({
  canStart,
  onUpdate,
  onEnd,
  getBounds,
  acceleration = 2,
}: GetPinchZoomHandlersOptions<E>): PinchZoomHandlers<E> {
  const start: { x: number; y: number; distance: number } = { x: 0, y: 0, distance: 0 };
  let prevScale = 1;
  let prevDeltaX = 0;
  let prevDeltaY = 0;
  let changed = false;
  let state: ReturnType<PinchZoomHandlers<E>['getState']>;

  const begin = (event: E): void => {
    // If previous state is finished, reset changed flag.
    if (!state) {
      changed = false;
    }
    state = event.touches.length >= 2 ? 'zoom' : 'move';
    prevDeltaX = 0;
    prevDeltaY = 0;
    if (state === 'zoom') {
      prevScale = 1;
    }

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    // Calculate where the fingers have started on the X and Y axis
    Object.assign(start, getPoint(touch1, touch2));
    start.distance = touch2 ? getDistanceBetweenFingers(touch1, touch2) : 0;
    // console.log('begin', state, start, event);
  };

  const end = (x?: number, y?: number): void => {
    // console.log('end', correctedPoint);
    state = undefined;
    // changed = false;
    onEnd(x, y);
  };

  const onTouchStart = (event: E): void => {
    if (event.touches.length > 2) return;
    if (!canStart(state ?? 'move', event)) return;
    begin(event);
    if (state === 'zoom') {
      preventDefault(event); // Prevent click and so on
      // stopPropagation(event);
    }
  };

  const onTouchMove = (event: E): void => {
    if (state == null) return;
    preventDefault(event); // Prevent page scroll
    // stopPropagation(event);

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    // Calculate how much the fingers have moved on the X and Y axis
    const point = getPoint(touch1, touch2);
    const deltaX = (point.x - start.x) * acceleration; // * for accelarated movement
    const deltaY = (point.y - start.y) * acceleration; // * for accelarated movement
    const deltaOffsetX = deltaX - prevDeltaX;
    const deltaOffsetY = deltaY - prevDeltaY;
    prevDeltaX = deltaX;
    prevDeltaY = deltaY;
    changed = true;

    if (touch2 && state === 'zoom') {
      // Calculate the scale
      const deltaDistance = getDistanceBetweenFingers(touch1, touch2);
      const scale = deltaDistance / start.distance;
      const deltaScale = scale - prevScale;
      prevScale = scale;
      // console.log(state, { scale, deltaScale, deltaX, deltaY, deltaOffsetX, deltaOffsetY });
      onUpdate(deltaScale, deltaOffsetX, deltaOffsetY);
    } else {
      // console.log(state, { deltaX, deltaY, deltaOffsetX, deltaOffsetY });
      onUpdate(0, deltaOffsetX, deltaOffsetY);
    }
  };

  const onTouchEnd = (event: E): void => {
    // console.log('END', state, changed, event.touches.length, event);
    if (!state) return;
    if (changed) {
      preventDefault(event); // Prevent click and so on
      // stopPropagation(event);
    }
    // If one finger remains, restart potential pan
    if (event.touches.length === 1) {
      begin(event);
      return;
    }
    if (event.touches.length > 0) return;

    // Calculate offsets if out of bounds
    if (getBounds && changed) {
      const [targetRect, boundsRect] = getBounds();
      // console.log('FIX', targetRect, boundsRect, window.scrollX, window.scrollY);

      const byLeft = targetRect.left + window.scrollX > boundsRect.left;
      const byTop = targetRect.top + window.scrollY > boundsRect.top;
      const byRight = targetRect.right + window.scrollX < boundsRect.right;
      const byBottom = targetRect.bottom + window.scrollY < boundsRect.bottom;

      if (byLeft || byTop || byRight || byBottom) {
        const x =
          byLeft || byRight
            ? ((targetRect.width - boundsRect.width) / 2 || 0) -
              (byRight ? targetRect.width - boundsRect.width : 0)
            : 0;
        const y =
          byTop || byBottom
            ? ((targetRect.height - boundsRect.height) / 2 || 0) -
              (byBottom ? targetRect.height - boundsRect.height : 0)
            : 0;

        end(x, y);
        // console.log('FIX', x, y, byLeft, byTop, byRight, byBottom);
        return;
      }
    }

    end();
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    getState: () => state,
    // isChanged: () => changed,
  };
}
