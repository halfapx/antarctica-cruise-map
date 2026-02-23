import { Map, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl/dist/maplibre-gl-csp-dev.js';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONSource } from 'maplibre-gl/dist/maplibre-gl-csp-dev.js';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker-dev.js?url';

setWorkerUrl(maplibreglWorkerUrl);

const isPointCoordinates = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number';

const isLineCoordinates = (value: unknown): value is [number, number][] =>
  Array.isArray(value) && value.every((item) => isPointCoordinates(item));

const resetViewButton = document.getElementById('reset-view');
const flightsToggle = document.getElementById('toggle-flights') as HTMLInputElement | null;
const flightLegendItems = Array.from(document.querySelectorAll('.legend-flight')) as HTMLElement[];

const minimapContainer = document.createElement('div');
minimapContainer.id = 'minimap';
minimapContainer.className = 'minimap minimap-hidden';
document.body.appendChild(minimapContainer);

const map = new Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/bright',
  center: [-62, -63],
  zoom: 3.2
});

const minimap = new Map({
  container: 'minimap',
  style: 'https://tiles.openfreemap.org/styles/bright',
  center: [-62, -63],
  zoom: 3,
  interactive: false,
  attributionControl: false
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

const MINIMAP_ZOOM_THRESHOLD = 5.5;

const isAntarcticPeninsulaFocus = () => {
  const center = map.getCenter();
  const inPeninsulaBounds =
    center.lng >= -71 && center.lng <= -54 && center.lat >= -67.5 && center.lat <= -60;
  return map.getZoom() >= MINIMAP_ZOOM_THRESHOLD && inPeninsulaBounds;
};

const syncMinimapVisibility = () => {
  minimapContainer.classList.toggle('minimap-hidden', !isAntarcticPeninsulaFocus());
};

const toViewportPolygon = () => {
  const bounds = map.getBounds();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[west, south], [west, north], [east, north], [east, south], [west, south]]]
    }
  };
};

const syncMinimapViewport = () => {
  const source = minimap.getSource('minimap-viewport') as GeoJSONSource | undefined;
  if (!source) {
    return;
  }
  source.setData(toViewportPolygon());
};

const syncMinimapState = () => {
  minimap.easeTo({
    center: map.getCenter(),
    duration: 0,
    essential: true
  });
  syncMinimapViewport();
  syncMinimapVisibility();
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

  minimap.on('load', () => {
    minimap.addSource('minimap-viewport', {
      type: 'geojson',
      data: toViewportPolygon()
    });

    minimap.addLayer({
      id: 'minimap-viewport-fill',
      type: 'fill',
      source: 'minimap-viewport',
      paint: {
        'fill-color': '#38bdf8',
        'fill-opacity': 0.12
      }
    });

    minimap.addLayer({
      id: 'minimap-viewport-outline',
      type: 'line',
      source: 'minimap-viewport',
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 1.5
      }
    });

    syncMinimapState();
  });

  map.on('move', syncMinimapState);
  map.on('zoom', syncMinimapState);

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
    id: 'flight-point-labels',
    type: 'symbol',
    source: 'flight',
    filter: ['==', ['geometry-type'], 'Point'],
    minzoom: 6.8,
    layout: {
      'text-field': ['coalesce', ['get', 'Name'], ['get', 'Port_Name'], ''],
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 12],
      'text-anchor': 'left',
      'text-offset': [0.9, 0],
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.2
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
    id: 'flight-out-point-labels',
    type: 'symbol',
    source: 'flight-out',
    filter: ['==', ['geometry-type'], 'Point'],
    minzoom: 6.8,
    layout: {
      'text-field': ['coalesce', ['get', 'Name'], ['get', 'Port_Name'], ''],
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 12],
      'text-anchor': 'left',
      'text-offset': [0.9, 0],
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.2
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

  map.addLayer({
    id: 'trip-point-labels',
    type: 'symbol',
    source: 'trip',
    filter: ['==', ['geometry-type'], 'Point'],
    minzoom: 5.2,
    layout: {
      'text-field': ['coalesce', ['get', 'Name'], ['get', 'Port_Name'], ''],
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 12],
      'text-anchor': 'left',
      'text-offset': [0.9, 0],
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.2
    }
  });

  const popup = new Popup({ closeButton: false, closeOnClick: false });
  let isPopupPinned = false;

  const flightLayerIds = [
    'flight-track',
    'flight-points',
    'flight-point-labels',
    'flight-out-track',
    'flight-out-points',
    'flight-out-point-labels'
  ];
  const setFlightLayersVisibility = (isVisible: boolean) => {
    const visibility: 'visible' | 'none' = isVisible ? 'visible' : 'none';
    flightLayerIds.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    flightLegendItems.forEach((item) => {
      item.style.display = isVisible ? 'flex' : 'none';
    });

    if (!isVisible) {
      isPopupPinned = false;
      popup.remove();
    }
  };

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

  const createBoundsAccumulator = () => ({
    west: Infinity,
    south: Infinity,
    east: -Infinity,
    north: -Infinity
  });

  const tripBounds = createBoundsAccumulator();
  const allBounds = createBoundsAccumulator();

  const extendBounds = (target: ReturnType<typeof createBoundsAccumulator>, coordinate: [number, number]) => {
    const [lng, lat] = coordinate;
    if (lng < target.west) target.west = lng;
    if (lat < target.south) target.south = lat;
    if (lng > target.east) target.east = lng;
    if (lat > target.north) target.north = lat;
  };

  const hasBounds = (target: ReturnType<typeof createBoundsAccumulator>) =>
    Number.isFinite(target.west) &&
    Number.isFinite(target.south) &&
    Number.isFinite(target.east) &&
    Number.isFinite(target.north);

  const toBoundsArray = (
    target: ReturnType<typeof createBoundsAccumulator>
  ): [[number, number], [number, number]] => [
    [target.west, target.south],
    [target.east, target.north]
  ];

  data.features.forEach((feature) => {
    const geometry = feature.geometry;
    if (!geometry) {
      return;
    }
    if (geometry.type === 'Point' && isPointCoordinates(geometry.coordinates)) {
      extendBounds(tripBounds, geometry.coordinates);
      extendBounds(allBounds, geometry.coordinates);
    }
    if (geometry.type === 'LineString' && isLineCoordinates(geometry.coordinates)) {
      geometry.coordinates.forEach((coordinate) => {
        extendBounds(tripBounds, coordinate);
        extendBounds(allBounds, coordinate);
      });
    }
  });

  const getActiveBounds = () => (flightsToggle?.checked === false ? tripBounds : allBounds);

  const fitToActiveBounds = (duration: number) => {
    const activeBounds = getActiveBounds();
    if (hasBounds(activeBounds)) {
      map.fitBounds(toBoundsArray(activeBounds), { padding: 60, duration });
      return true;
    }
    return false;
  };

  const resetToInitialView = () => {
    if (fitToActiveBounds(900)) {
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
    flightLineFeature.geometry.coordinates.forEach((coordinate) => extendBounds(allBounds, coordinate));
  }

  const flightOutLineFeature = flightOutData.features.find((feature) => feature.geometry?.type === 'LineString');
  if (
    flightOutLineFeature?.geometry?.type === 'LineString' &&
    isLineCoordinates(flightOutLineFeature.geometry.coordinates)
  ) {
    flightOutLineFeature.geometry.coordinates.forEach((coordinate) => extendBounds(allBounds, coordinate));
  }

  fitToActiveBounds(0);

  if (resetViewButton) {
    resetViewButton.addEventListener('click', resetToInitialView);
  }

  if (flightsToggle) {
    setFlightLayersVisibility(flightsToggle.checked);
    flightsToggle.addEventListener('change', () => {
      setFlightLayersVisibility(flightsToggle.checked);
      fitToActiveBounds(700);
    });
  }

  syncMinimapVisibility();
});
