import type { Feature, FeatureCollection, Geometry } from "geojson";

export type FlightPointType = "flight_origin" | "flight_stopover" | "flight_destination";

export type FlightStop = {
  name: string;
  country: string;
  airportCode: string;
  coordinates: [number, number];
};

const toFlightPointType = (index: number, count: number): FlightPointType => {
  if (index === 0) {
    return "flight_origin";
  }

  if (index === count - 1) {
    return "flight_destination";
  }

  return "flight_stopover";
};

export const buildFlightCollection = (
  leg: "flight" | "flight_out",
  stops: FlightStop[],
): FeatureCollection<Geometry, Record<string, unknown>> => {
  const lineFeature: Feature<Geometry, Record<string, unknown>> = {
    type: "Feature",
    properties: { leg },
    geometry: {
      type: "LineString",
      coordinates: stops.map((stop) => stop.coordinates),
    },
  };

  const pointFeatures: Feature<Geometry, Record<string, unknown>>[] = stops.map((stop, index) => {
    const pointType = toFlightPointType(index, stops.length);

    return {
      type: "Feature",
      properties: {
        point_type: pointType,
        Feature_type: pointType,
        Name: stop.name,
        Country: stop.country,
        Airport_code: stop.airportCode,
      },
      geometry: {
        type: "Point",
        coordinates: stop.coordinates,
      },
    };
  });

  return {
    type: "FeatureCollection",
    features: [lineFeature, ...pointFeatures],
  };
};
