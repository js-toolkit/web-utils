export function getGeoCoordinates({
  timeout = 10000,
  maximumAge = 60000,
  ...rest
}: PositionOptions = {}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      { timeout, maximumAge, ...rest }
    );
  });
}

export default getGeoCoordinates;
