import type { FeatureCollection, Geometry } from "geojson";
import type { Map } from "maplibre-gl/dist/maplibre-gl-csp-dev.js";
import { isLineCoordinates, isPointCoordinates } from "./coordinates";

export type BoundsAccumulator = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export const createBoundsAccumulator = (): BoundsAccumulator => ({
  west: Infinity,
  south: Infinity,
  east: -Infinity,
  north: -Infinity,
});

export const extendBounds = (target: BoundsAccumulator, coordinate: [number, number]) => {
  const [lng, lat] = coordinate;
  if (lng < target.west) target.west = lng;
  if (lat < target.south) target.south = lat;
  if (lng > target.east) target.east = lng;
  if (lat > target.north) target.north = lat;
};

export const hasBounds = (target: BoundsAccumulator) =>
  Number.isFinite(target.west) &&
  Number.isFinite(target.south) &&
  Number.isFinite(target.east) &&
  Number.isFinite(target.north);

export const toBoundsArray = (target: BoundsAccumulator): [[number, number], [number, number]] => [
  [target.west, target.south],
  [target.east, target.north],
];

const extendBoundsFromFeatureCollection = (
  collection: FeatureCollection<Geometry, Record<string, unknown>>,
  ...targets: BoundsAccumulator[]
) => {
  collection.features.forEach((feature) => {
    const geometry = feature.geometry;
    if (!geometry) {
      return;
    }

    if (geometry.type === "Point" && isPointCoordinates(geometry.coordinates)) {
      const coordinates = geometry.coordinates;
      targets.forEach((target) => extendBounds(target, coordinates));
      return;
    }

    if (geometry.type === "LineString" && isLineCoordinates(geometry.coordinates)) {
      const coordinates = geometry.coordinates;
      coordinates.forEach((coordinate) => {
        targets.forEach((target) => extendBounds(target, coordinate));
      });
    }
  });
};

export const buildTripAndAllBounds = (
  tripData: FeatureCollection<Geometry, Record<string, unknown>>,
  flightsInData: FeatureCollection<Geometry, Record<string, unknown>>,
  flightsOutData: FeatureCollection<Geometry, Record<string, unknown>>,
) => {
  const tripBounds = createBoundsAccumulator();
  const allBounds = createBoundsAccumulator();

  extendBoundsFromFeatureCollection(tripData, tripBounds, allBounds);

  extendBoundsFromFeatureCollection(
    {
      ...flightsInData,
      features: flightsInData.features.filter((feature) => feature.geometry?.type === "LineString"),
    },
    allBounds,
  );

  extendBoundsFromFeatureCollection(
    {
      ...flightsOutData,
      features: flightsOutData.features.filter((feature) => feature.geometry?.type === "LineString"),
    },
    allBounds,
  );

  return { tripBounds, allBounds };
};

export const fitMapToBounds = (
  map: Map,
  bounds: BoundsAccumulator,
  duration: number,
  padding = 60,
): boolean => {
  if (!hasBounds(bounds)) {
    return false;
  }

  map.fitBounds(toBoundsArray(bounds), { padding, duration });
  return true;
};
