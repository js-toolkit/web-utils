export interface GeoLocalityOptions extends Pick<GeolocationCoordinates, 'longitude' | 'latitude'> {
  lang?: string;
}

export default function getGeoLocality({
  longitude,
  latitude,
  lang,
}: GeoLocalityOptions): Promise<string> {
  const url = new URL(
    'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode'
  );
  url.searchParams.set('f', 'json');
  url.searchParams.set('featureTypes', 'Locality');
  url.searchParams.set('location', `{ x: ${longitude}, y: ${latitude} }`);
  lang && url.searchParams.set('langCode', lang);

  return window
    .fetch(url.toString())
    .then((res) => res.json())
    .then((data) => {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const { address, error } = data;
      if (error) throw new Error(error.message);
      return (address.PlaceName || address.LongLabel || address.ShortLabel || '') as string;
    });
}
