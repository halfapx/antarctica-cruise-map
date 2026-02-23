import type { Map } from "maplibre-gl/dist/maplibre-gl-csp-dev.js";
import type { MapColors } from "./theme";

const PORT_CALL_CLICK_ZOOM = 11.5;
const START_END_CLICK_ZOOM = 10;
const FLIGHT_POINT_CLICK_ZOOM = 8.5;
const POI_CLICK_ZOOM = 11.5;

const FLIGHT_LABEL_MIN_ZOOM = 6.8;
const TRIP_LABEL_MIN_ZOOM = 5.2;
const POI_LABEL_MIN_ZOOM = 6.5;

export const FLIGHT_LAYER_IDS = [
  "flight-track",
  "flight-points",
  "flight-point-labels",
  "flight-out-track",
  "flight-out-points",
  "flight-out-point-labels",
] as const;

export const INTERACTIVE_POINT_LAYER_IDS = [
  "port-calls-hit",
  "start-end",
  "flight-points",
  "flight-out-points",
  "antarctic-poi-hit",
] as const;

export const POINT_CLICK_ZOOM_BY_LAYER: Record<(typeof INTERACTIVE_POINT_LAYER_IDS)[number], number> = {
  "port-calls-hit": PORT_CALL_CLICK_ZOOM,
  "start-end": START_END_CLICK_ZOOM,
  "flight-points": FLIGHT_POINT_CLICK_ZOOM,
  "flight-out-points": FLIGHT_POINT_CLICK_ZOOM,
  "antarctic-poi-hit": POI_CLICK_ZOOM,
};

export const addMapLayers = (map: Map, mapColors: MapColors) => {
  const POINT_PIN_RADIUS = 4;
  const FLIGHT_POINT_RADIUS = 5;
  const START_END_RADIUS = 7;
  const HIT_RADIUS = 14;
  const POINT_STROKE_WIDTH = 1;
  const FLIGHT_POINT_STROKE_WIDTH = 1.2;
  const START_END_STROKE_WIDTH = 1.5;

  const roundedLineLayout = {
    "line-cap": "round",
    "line-join": "round",
  } as const;

  const flightTrackBasePaint = {
    "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 6, 3, 10, 4],
    "line-opacity": 0.9,
    "line-dasharray": [2, 1.5],
  } as const;

  const addFlightTrackLayer = (id: string, source: string, color: string) => {
    map.addLayer({
      id,
      type: "line",
      source,
      filter: ["==", ["geometry-type"], "LineString"],
      layout: roundedLineLayout,
      paint: {
        "line-color": color,
        ...flightTrackBasePaint,
      },
    });
  };

  const pointLabelBaseLayout = {
    "text-field": ["coalesce", ["get", "Name"], ["get", "Port_Name"], ""],
    "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 12, 12],
    "text-anchor": "left",
    "text-offset": [0.9, 0],
    "text-allow-overlap": false,
  } as const;

  const pointLabelBasePaint = {
    "text-color": mapColors.textPrimary,
    "text-halo-color": mapColors.textHalo,
    "text-halo-width": 1.2,
  } as const;

  const addPointLabelLayer = (id: string, source: string, minzoom: number) => {
    map.addLayer({
      id,
      type: "symbol",
      source,
      filter: ["==", ["geometry-type"], "Point"],
      minzoom,
      layout: pointLabelBaseLayout,
      paint: pointLabelBasePaint,
    });
  };

  const addFlightPointLayer = (id: string, source: string, lineColor: string, stopoverColor: string) => {
    map.addLayer({
      id,
      type: "circle",
      source,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": [
          "case",
          ["==", ["get", "point_type"], "flight_origin"],
          lineColor,
          ["==", ["get", "point_type"], "flight_stopover"],
          stopoverColor,
          lineColor,
        ],
        "circle-radius": FLIGHT_POINT_RADIUS,
        "circle-stroke-color": mapColors.pointStroke,
        "circle-stroke-width": FLIGHT_POINT_STROKE_WIDTH,
      },
    });
  };

  const addHitLayer = (
    id: string,
    source: string,
    color: string,
    filter?: unknown[],
    beforeId?: string,
  ) => {
    map.addLayer(
      {
        id,
        type: "circle",
        source,
        ...(filter ? { filter } : {}),
        paint: {
          "circle-radius": HIT_RADIUS,
          "circle-color": color,
          "circle-opacity": 0,
        },
      },
      beforeId,
    );
  };

  const addPointPinLayer = (
    id: string,
    source: string,
    color: string | unknown[],
    filter?: unknown[],
    beforeId?: string,
    options?: {
      radius?: number;
      strokeColor?: string;
      strokeWidth?: number;
    },
  ) => {
    const { radius = POINT_PIN_RADIUS, strokeColor = mapColors.textPrimary, strokeWidth = POINT_STROKE_WIDTH } = options ?? {};

    map.addLayer(
      {
        id,
        type: "circle",
        source,
        ...(filter ? { filter } : {}),
        paint: {
          "circle-color": color,
          "circle-radius": radius,
          "circle-stroke-color": strokeColor,
          "circle-stroke-width": strokeWidth,
        },
      },
      beforeId,
    );
  };

  addFlightTrackLayer("flight-track", "flight", mapColors.flightInLine);
  addFlightPointLayer("flight-points", "flight", mapColors.flightInLine, mapColors.flightInStopover);

  addPointLabelLayer("flight-point-labels", "flight", FLIGHT_LABEL_MIN_ZOOM);

  addFlightTrackLayer("flight-out-track", "flight-out", mapColors.flightOutLine);
  addFlightPointLayer("flight-out-points", "flight-out", mapColors.flightOutLine, mapColors.flightOutStopover);

  addPointLabelLayer("flight-out-point-labels", "flight-out", FLIGHT_LABEL_MIN_ZOOM);

  map.addLayer({
    id: "track",
    type: "line",
    source: "trip",
    filter: ["==", ["geometry-type"], "LineString"],
    layout: roundedLineLayout,
    paint: {
      "line-color": mapColors.track,
      "line-width": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 4, 10, 6],
      "line-opacity": 0.95,
    },
  });

  addPointPinLayer("port-calls", "trip", mapColors.portCall, ["==", ["get", "Feature_type"], "port_call"]);

  addHitLayer("port-calls-hit", "trip", mapColors.portCallHit, ["==", ["get", "Feature_type"], "port_call"]);

  addPointPinLayer(
    "start-end",
    "trip",
    ["case", ["==", ["get", "Feature_type"], "start"], mapColors.start, mapColors.end],
    ["any", ["==", ["get", "Feature_type"], "start"], ["==", ["get", "Feature_type"], "end"]],
    undefined,
    {
      radius: START_END_RADIUS,
      strokeColor: mapColors.pointStroke,
      strokeWidth: START_END_STROKE_WIDTH,
    },
  );

  addPointLabelLayer("trip-point-labels", "trip", TRIP_LABEL_MIN_ZOOM);

  addPointPinLayer("antarctic-poi-pins", "antarctic-pois", mapColors.poi, undefined, "port-calls");

  addHitLayer("antarctic-poi-hit", "antarctic-pois", mapColors.poiHit, undefined, "port-calls");

  map.addLayer({
    id: "antarctic-poi-labels",
    type: "symbol",
    source: "antarctic-pois",
    minzoom: POI_LABEL_MIN_ZOOM,
    layout: {
      "text-field": ["get", "Name"],
      "text-size": ["interpolate", ["linear"], ["zoom"], POI_LABEL_MIN_ZOOM, 10, 10, 12],
      "text-anchor": "left",
      "text-offset": [0.9, 0],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": mapColors.textPrimary,
      "text-halo-color": mapColors.textHalo,
      "text-halo-width": 1.4,
    },
  });
};
