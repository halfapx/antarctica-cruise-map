import type { FeatureCollection, Geometry } from "geojson";

export const flightsOutData: FeatureCollection<Geometry, Record<string, unknown>> = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "leg": "flight_out" },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-68.2948, -54.8433],
          [-58.4156, -34.5592],
          [-58.5358, -34.8222],
          [-3.5695, 40.4983],
          [8.5492, 47.4647]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_origin",
        "Feature_type": "flight_origin",
        "Name": "Ushuaia Airport",
        "Country": "Argentina",
        "Airport_code": "USH"
      },
      "geometry": { "type": "Point", "coordinates": [-68.2948, -54.8433] }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_stopover",
        "Feature_type": "flight_stopover",
        "Name": "Aeroparque Jorge Newbery",
        "Country": "Argentina",
        "Airport_code": "AEP"
      },
      "geometry": { "type": "Point", "coordinates": [-58.4156, -34.5592] }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_stopover",
        "Feature_type": "flight_stopover",
        "Name": "Ezeiza International Airport",
        "Country": "Argentina",
        "Airport_code": "EZE"
      },
      "geometry": { "type": "Point", "coordinates": [-58.5358, -34.8222] }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_stopover",
        "Feature_type": "flight_stopover",
        "Name": "Adolfo Suárez Madrid–Barajas Airport",
        "Country": "Spain",
        "Airport_code": "MAD"
      },
      "geometry": { "type": "Point", "coordinates": [-3.5695, 40.4983] }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_destination",
        "Feature_type": "flight_destination",
        "Name": "Zürich Airport",
        "Country": "Switzerland",
        "Airport_code": "ZRH"
      },
      "geometry": { "type": "Point", "coordinates": [8.5492, 47.4647] }
    }
  ]
};
