import type { FeatureCollection, Geometry } from "geojson";

export const antarcticPoiData: FeatureCollection<Geometry, Record<string, unknown>> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { Name: "Cuverville Island" },
      geometry: {
        type: "Point",
        coordinates: [-62.6232482, -64.6865094],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Foyn Harbour" },
      geometry: {
        type: "Point",
        coordinates: [-62.0011737, -64.5390266],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Guvernøren Shipwreck" },
      geometry: {
        type: "Point",
        coordinates: [-61.9980494, -64.5401148],
      },
    },
    {
      type: "Feature",
      properties: { Name: "D’Haintaut Island" },
      geometry: {
        type: "Point",
        coordinates: [-60.7910471, -63.9026661],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Paradise Bay" },
      geometry: {
        type: "Point",
        coordinates: [-62.8804199, -64.8688655],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Neko Harbour" },
      geometry: {
        type: "Point",
        coordinates: [-62.5804506, -64.8611503],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Petermann Island" },
      geometry: {
        type: "Point",
        coordinates: [-64.1417036, -65.1697863],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Yalour Islands" },
      geometry: {
        type: "Point",
        coordinates: [-64.1603303, -65.2356528],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Cape Tuxen" },
      geometry: {
        type: "Point",
        coordinates: [-64.1229718, -65.269761],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Wordie House" },
      geometry: {
        type: "Point",
        coordinates: [-64.254374, -65.251119],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Drake Passage" },
      geometry: {
        type: "Point",
        coordinates: [-63.2377741, -59.9679896],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Drake Passage" },
      geometry: {
        type: "Point",
        coordinates: [-63.2377741, -59.9679896],
      },
    },
    {
      type: "Feature",
      properties: { Name: "Waiting Donuts" },
      geometry: {
        type: "Point",
        coordinates: [-66.7944345, -55.0101301],
      },
    },
  ],
};
