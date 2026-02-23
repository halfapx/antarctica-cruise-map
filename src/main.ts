import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url';

const { Map, NavigationControl, Popup } = maplibregl;

maplibregl.setWorkerUrl(maplibreglWorkerUrl);

const isPointCoordinates = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number';

const isLineCoordinates = (value: unknown): value is [number, number][] =>
  Array.isArray(value) && value.every((item) => isPointCoordinates(item));

const resetViewButton = document.getElementById('reset-view');

const map = new Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/bright',
  center: [-62, -63],
  zoom: 3.2
});

const FLAT_MAP_ZOOM_THRESHOLD = 5.25;
let currentProjectionType: 'globe' | 'mercator' | null = null;

const setMapProjection = (projectionType: 'globe' | 'mercator') => {
  if (typeof map.setProjection !== 'function' || currentProjectionType === projectionType) {
    return;
  }

  try {
    map.setProjection({ type: projectionType });
    currentProjectionType = projectionType;
  } catch {
    try {
      map.setProjection(projectionType as never);
      currentProjectionType = projectionType;
    } catch {
      currentProjectionType = null;
    }
  }
};

const syncProjectionToZoom = () => {
  const projectionType = map.getZoom() >= FLAT_MAP_ZOOM_THRESHOLD ? 'mercator' : 'globe';
  setMapProjection(projectionType);
};

map.addControl(new NavigationControl(), 'top-right');

const loadGeoJson = async (url: string): Promise<FeatureCollection<Geometry, Record<string, unknown>>> => {
  const response = await fetch(url);
  return response.json();
};

const [data, flightData, flightOutData] = await Promise.all([
  loadGeoJson('/through-the-lens.geojson'),
  loadGeoJson('/flights-in.geojson'),
  loadGeoJson('/flights-out.geojson')
]);

map.on('load', () => {
  syncProjectionToZoom();
  map.on('zoom', syncProjectionToZoom);
  map.on('styledata', syncProjectionToZoom);

  map.addSource('trip', { type: 'geojson', data });
  map.addSource('flight', { type: 'geojson', data: flightData });
  map.addSource('flight-out', { type: 'geojson', data: flightOutData });

  map.addLayer({
    id: 'flight-track',
    type: 'line',
    source: 'flight',
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#a855f7',
      'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 6, 3, 10, 4],
      'line-opacity': 0.9,
      'line-dasharray': [2, 1.5]
    }
  });

  map.addLayer({
    id: 'flight-points',
    type: 'circle',
    source: 'flight',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'point_type'], 'flight_origin'],
        '#7c3aed',
        ['==', ['get', 'point_type'], 'flight_stopover'],
        '#c084fc',
        '#a855f7'
      ],
      'circle-radius': 5,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.2
    }
  });

  map.addLayer({
    id: 'flight-out-track',
    type: 'line',
    source: 'flight-out',
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#7e22ce',
      'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 6, 3, 10, 4],
      'line-opacity': 0.9,
      'line-dasharray': [2, 1.5]
    }
  });

  map.addLayer({
    id: 'flight-out-points',
    type: 'circle',
    source: 'flight-out',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'point_type'], 'flight_origin'],
        '#6d28d9',
        ['==', ['get', 'point_type'], 'flight_stopover'],
        '#a855f7',
        '#c084fc'
      ],
      'circle-radius': 5,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.2
    }
  });

  map.addLayer({
    id: 'track',
    type: 'line',
    source: 'trip',
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#38bdf8',
      'line-width': ['interpolate', ['linear'], ['zoom'], 2, 2.5, 6, 4, 10, 6],
      'line-opacity': 0.95
    }
  });

  map.addLayer({
    id: 'port-calls',
    type: 'circle',
    source: 'trip',
    filter: ['==', ['get', 'Feature_type'], 'port_call'],
    paint: {
      'circle-color': '#f59e0b',
      'circle-radius': 4,
      'circle-stroke-color': '#111827',
      'circle-stroke-width': 1
    }
  });

  map.addLayer({
    id: 'port-calls-hit',
    type: 'circle',
    source: 'trip',
    filter: ['==', ['get', 'Feature_type'], 'port_call'],
    paint: {
      'circle-radius': 14,
      'circle-color': '#000000',
      'circle-opacity': 0
    }
  });

  map.addLayer({
    id: 'start-end',
    type: 'circle',
    source: 'trip',
    filter: ['any', ['==', ['get', 'Feature_type'], 'start'], ['==', ['get', 'Feature_type'], 'end']],
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'Feature_type'], 'start'],
        '#22c55e',
        '#ef4444'
      ],
      'circle-radius': 7,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1.5
    }
  });

  const popup = new Popup({ closeButton: false, closeOnClick: false });
  let isPopupPinned = false;

  const getPopupHtml = (feature: Feature<Geometry, Record<string, unknown>>) => {
    const props = feature.properties ?? {};
    const title = (props.Name as string) || (props.Port_Name as string) || 'Stop';
    const type = (props.Feature_type as string) || (props.point_type as string) || 'point';
    const country = (props.Country as string) || (props.Country_code as string) || 'Unknown';
    const airportCode = props.Airport_code ? `<br/>Airport: ${props.Airport_code}` : '';
    return `<strong>${title}</strong><br/>Type: ${type}<br/>Country: ${country}${airportCode}`;
  };

  const showPopupForPointFeature = (feature: Feature<Geometry, Record<string, unknown>>) => {
    if (!feature || feature.geometry?.type !== 'Point' || !isPointCoordinates(feature.geometry.coordinates)) {
      return;
    }

    popup.setLngLat(feature.geometry.coordinates).setHTML(getPopupHtml(feature)).addTo(map);
  };

  const interactivePointLayers = ['port-calls-hit', 'start-end', 'flight-points', 'flight-out-points'];
  interactivePointLayers.forEach((layerId) => {
    map.on('mouseenter', layerId, (event) => {
      map.getCanvas().style.cursor = 'pointer';
      const feature = event.features?.[0] as unknown as Feature<Geometry, Record<string, unknown>> | undefined;
      if (!feature || isPopupPinned) {
        return;
      }
      showPopupForPointFeature(feature);
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
      if (!isPopupPinned) {
        popup.remove();
      }
    });
  });

  map.on('click', 'port-calls-hit', (event) => {
    const feature = event.features?.[0] as unknown as Feature<Geometry, Record<string, unknown>> | undefined;
    if (!feature || feature.geometry?.type !== 'Point' || !isPointCoordinates(feature.geometry.coordinates)) {
      return;
    }

    isPopupPinned = true;
    showPopupForPointFeature(feature);

    map.easeTo({
      center: feature.geometry.coordinates,
      zoom: 11.5,
      duration: 900,
      essential: true
    });
  });

  map.on('click', 'flight-points', (event) => {
    const feature = event.features?.[0] as unknown as Feature<Geometry, Record<string, unknown>> | undefined;
    if (!feature || feature.geometry?.type !== 'Point' || !isPointCoordinates(feature.geometry.coordinates)) {
      return;
    }

    isPopupPinned = true;
    showPopupForPointFeature(feature);

    map.easeTo({
      center: feature.geometry.coordinates,
      zoom: 8.5,
      duration: 900,
      essential: true
    });
  });

  map.on('click', 'flight-out-points', (event) => {
    const feature = event.features?.[0] as unknown as Feature<Geometry, Record<string, unknown>> | undefined;
    if (!feature || feature.geometry?.type !== 'Point' || !isPointCoordinates(feature.geometry.coordinates)) {
      return;
    }

    isPopupPinned = true;
    showPopupForPointFeature(feature);

    map.easeTo({
      center: feature.geometry.coordinates,
      zoom: 8.5,
      duration: 900,
      essential: true
    });
  });

  map.on('click', (event) => {
    const featuresAtClick = map.queryRenderedFeatures(event.point, {
      layers: interactivePointLayers
    });
    if (featuresAtClick.length > 0) {
      return;
    }

    isPopupPinned = false;
    popup.remove();
  });

  let boundsWest = Infinity;
  let boundsSouth = Infinity;
  let boundsEast = -Infinity;
  let boundsNorth = -Infinity;

  const extendBounds = (coordinate: [number, number]) => {
    const [lng, lat] = coordinate;
    if (lng < boundsWest) boundsWest = lng;
    if (lat < boundsSouth) boundsSouth = lat;
    if (lng > boundsEast) boundsEast = lng;
    if (lat > boundsNorth) boundsNorth = lat;
  };

  const hasBounds = () =>
    Number.isFinite(boundsWest) &&
    Number.isFinite(boundsSouth) &&
    Number.isFinite(boundsEast) &&
    Number.isFinite(boundsNorth);

  const toBoundsArray = (): [[number, number], [number, number]] => [
    [boundsWest, boundsSouth],
    [boundsEast, boundsNorth]
  ];

  data.features.forEach((feature) => {
    const geometry = feature.geometry;
    if (!geometry) {
      return;
    }
    if (geometry.type === 'Point' && isPointCoordinates(geometry.coordinates)) {
      extendBounds(geometry.coordinates);
    }
    if (geometry.type === 'LineString' && isLineCoordinates(geometry.coordinates)) {
      geometry.coordinates.forEach((coordinate) => extendBounds(coordinate));
    }
  });

  const resetToInitialView = () => {
    if (hasBounds()) {
      map.fitBounds(toBoundsArray(), { padding: 60, duration: 900 });
      return;
    }

    map.easeTo({
      center: [-62, -63],
      zoom: 3.2,
      duration: 900,
      essential: true
    });
  };

  const flightLineFeature = flightData.features.find((feature) => feature.geometry?.type === 'LineString');
  if (
    flightLineFeature?.geometry?.type === 'LineString' &&
    isLineCoordinates(flightLineFeature.geometry.coordinates)
  ) {
    flightLineFeature.geometry.coordinates.forEach((coordinate) => extendBounds(coordinate));
  }

  const flightOutLineFeature = flightOutData.features.find((feature) => feature.geometry?.type === 'LineString');
  if (
    flightOutLineFeature?.geometry?.type === 'LineString' &&
    isLineCoordinates(flightOutLineFeature.geometry.coordinates)
  ) {
    flightOutLineFeature.geometry.coordinates.forEach((coordinate) => extendBounds(coordinate));
  }

  if (hasBounds()) {
    map.fitBounds(toBoundsArray(), { padding: 60, duration: 0 });
  }

  if (resetViewButton) {
    resetViewButton.addEventListener('click', resetToInitialView);
  }
});
