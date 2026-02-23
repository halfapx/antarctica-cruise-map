import type { FeatureCollection, Geometry } from "geojson";

export const flightsInData: FeatureCollection<Geometry, Record<string, unknown>> = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "leg": "flight" },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [8.5492, 47.4647],
          [-3.5695, 40.4983],
          [-70.7944, -33.393],
          [-70.8546, -53.0026],
          [-58.9867, -62.1906]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_origin",
        "Feature_type": "flight_origin",
        "Name": "Zürich Airport",
        "Country": "Switzerland",
        "Airport_code": "ZRH"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [8.5492, 47.4647]
      }
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
      "geometry": {
        "type": "Point",
        "coordinates": [-3.5695, 40.4983]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_stopover",
        "Feature_type": "flight_stopover",
        "Name": "Santiago International Airport",
        "Country": "Chile",
        "Airport_code": "SCL"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-70.7944, -33.393]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_stopover",
        "Feature_type": "flight_stopover",
        "Name": "Presidente Carlos Ibáñez del Campo International Airport",
        "Country": "Chile",
        "Airport_code": "PUQ"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-70.8546, -53.0026]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "point_type": "flight_destination",
        "Feature_type": "flight_destination",
        "Name": "Teniente R. Marsh Airport",
        "Country": "Antarctica",
        "Airport_code": "SCRM"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-58.9867, -62.1906]
      }
    }
  ]
};
