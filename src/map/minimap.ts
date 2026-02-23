import type { GeoJSONSource, Map } from "maplibre-gl/dist/maplibre-gl-csp-dev.js";
import type { MapColors } from "./theme";

type SetupMinimapAndProjectionOptions = {
  map: Map;
  minimap: Map;
  minimapContainer: HTMLElement;
  mapColors: MapColors;
  flatMapZoomThreshold?: number;
  minimapZoomThreshold?: number;
};

export const setupMinimapAndProjection = ({
  map,
  minimap,
  minimapContainer,
  mapColors,
  flatMapZoomThreshold = 5.25,
  minimapZoomThreshold = 5.5,
}: SetupMinimapAndProjectionOptions) => {
  let currentProjectionType: "globe" | "mercator" | null = null;

  const setMapProjection = (projectionType: "globe" | "mercator") => {
    if (typeof map.setProjection !== "function" || currentProjectionType === projectionType) {
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
    const projectionType = map.getZoom() >= flatMapZoomThreshold ? "mercator" : "globe";
    setMapProjection(projectionType);
  };

  const isAntarcticPeninsulaFocus = () => {
    const center = map.getCenter();
    const inPeninsulaBounds = center.lng >= -71 && center.lng <= -54 && center.lat >= -67.5 && center.lat <= -60;
    return map.getZoom() >= minimapZoomThreshold && inPeninsulaBounds;
  };

  const syncMinimapVisibility = () => {
    minimapContainer.classList.toggle("minimap-hidden", !isAntarcticPeninsulaFocus());
  };

  const toViewportPolygon = () => {
    const bounds = map.getBounds();
    const west = bounds.getWest();
    const east = bounds.getEast();
    const south = bounds.getSouth();
    const north = bounds.getNorth();

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, south],
            [west, north],
            [east, north],
            [east, south],
            [west, south],
          ],
        ],
      },
    };
  };

  const syncMinimapViewport = () => {
    const source = minimap.getSource("minimap-viewport") as GeoJSONSource | undefined;
    if (!source) {
      return;
    }
    source.setData(toViewportPolygon());
  };

  const syncMinimapState = () => {
    minimap.easeTo({
      center: map.getCenter(),
      duration: 0,
      essential: true,
    });
    syncMinimapViewport();
    syncMinimapVisibility();
  };

  const initMinimapViewport = () => {
    if (!minimap.getSource("minimap-viewport")) {
      minimap.addSource("minimap-viewport", {
        type: "geojson",
        data: toViewportPolygon(),
      });
    }

    if (!minimap.getLayer("minimap-viewport-fill")) {
      minimap.addLayer({
        id: "minimap-viewport-fill",
        type: "fill",
        source: "minimap-viewport",
        paint: {
          "fill-color": mapColors.minimapViewportFill,
          "fill-opacity": 0.12,
        },
      });
    }

    if (!minimap.getLayer("minimap-viewport-outline")) {
      minimap.addLayer({
        id: "minimap-viewport-outline",
        type: "line",
        source: "minimap-viewport",
        paint: {
          "line-color": mapColors.minimapViewportOutline,
          "line-width": 1.5,
        },
      });
    }

    syncMinimapState();
  };

  minimap.on("load", initMinimapViewport);
  if (minimap.isStyleLoaded()) {
    initMinimapViewport();
  }

  return {
    syncProjectionToZoom,
    syncMinimapState,
    syncMinimapVisibility,
  };
};
