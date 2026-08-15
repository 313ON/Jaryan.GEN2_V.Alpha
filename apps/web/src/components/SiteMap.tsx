'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, CircleMarker } from 'leaflet';

interface SiteMapProps {
  latitude: number;
  longitude: number;
  onCoordinateChange: (latitude: number, longitude: number) => void;
}

export default function SiteMap({
  latitude,
  longitude,
  onCoordinateChange,
}: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const onCoordinateChangeRef = useRef(onCoordinateChange);
  const [tileStatus, setTileStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    onCoordinateChangeRef.current = onCoordinateChange;
  }, [onCoordinateChange]);

  useEffect(() => {
    let cancelled = false;

    const createMap = async () => {
      if (!containerRef.current || mapRef.current) return;

      const leaflet = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      const map = leaflet.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 6,
        scrollWheelZoom: false,
      });
      const tiles = leaflet.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        },
      );
      tiles.on('load', () => setTileStatus('ready'));
      tiles.on('tileerror', () => setTileStatus('error'));
      tiles.addTo(map);

      const marker = leaflet
        .circleMarker([latitude, longitude], {
          radius: 8,
          color: '#f0d5ae',
          weight: 2,
          fillColor: '#b96945',
          fillOpacity: 0.95,
        })
        .addTo(map);

      map.on('click', (event) => {
        onCoordinateChangeRef.current(
          Number(event.latlng.lat.toFixed(5)),
          Number(event.latlng.lng.toFixed(5)),
        );
      });

      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => map.invalidateSize(), 0);
    };

    void createMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Coordinates are synchronized by the update effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return;
    }

    markerRef.current?.setLatLng([latitude, longitude]);
    mapRef.current?.panTo([latitude, longitude], { animate: false });
  }, [latitude, longitude]);

  return (
    <div className="site-map">
      <div
        ref={containerRef}
        className="site-map__canvas"
        aria-label="Interactive OpenStreetMap coordinate selector"
      />
      <div className={`site-map__status site-map__status--${tileStatus}`}>
        {tileStatus === 'loading' && 'Loading external map tiles…'}
        {tileStatus === 'ready' && 'Tap or click the map to set coordinates.'}
        {tileStatus === 'error' &&
          'Map tiles could not load. Manual coordinates remain available.'}
      </div>
    </div>
  );
}
