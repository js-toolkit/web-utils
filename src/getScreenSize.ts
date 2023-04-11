export type ScreenSize = Pick<Screen, 'width' | 'height'>;

export interface GetScreenSizeProps {
  /** Default `true`. */
  readonly respectOrientation?: boolean;
}

function angleToOrientationType(angle: number): OrientationType | undefined {
  if (angle === 0) return 'portrait-primary';
  if (angle === 180) return 'portrait-secondary';
  if (angle === 90) return 'landscape-primary';
  if (angle === -90) return 'landscape-secondary';
  return undefined;
}

export function getScreenSize({ respectOrientation = true }: GetScreenSizeProps = {}): ScreenSize {
  const { width, height, orientation } = window.screen;

  if (respectOrientation) {
    const orientationType = orientation
      ? orientation.type
      : angleToOrientationType(window.orientation);
    if (
      (orientationType === 'landscape-primary' || orientationType === 'landscape-secondary') &&
      width < height
    ) {
      return { width: height, height: width };
    }
  }

  return { width, height };
}
