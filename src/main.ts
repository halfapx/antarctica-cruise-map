import { Map, NavigationControl, setWorkerUrl } from "maplibre-gl/dist/maplibre-gl-csp-dev.js";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker-dev.js?url";
import { antarcticPoiData, flightsInData, flightsOutData, tripData } from "./data";
import {
  applyColorVariables,
  addMapLayers,
  buildTripAndAllBounds,
  FLIGHT_LAYER_IDS,
  fitMapToBounds,
  INTERACTIVE_POINT_LAYER_IDS,
  mapColors,
  POINT_CLICK_ZOOM_BY_LAYER,
  setupMinimapAndProjection,
  setupPointInteractions,
} from "./map";

setWorkerUrl(maplibreglWorkerUrl);

applyColorVariables(mapColors);

const resetViewButton = document.getElementById("reset-view");
const flightsToggle = document.getElementById("toggle-flights") as HTMLInputElement | null;
const flightLegendItems = Array.from(document.querySelectorAll(".legend-flight")) as HTMLElement[];

const minimapContainer = document.createElement("div");
minimapContainer.id = "minimap";
minimapContainer.className = "minimap minimap-hidden";
document.body.appendChild(minimapContainer);

const antarcticaBaseStyle = "https://tiles.openfreemap.org/styles/bright";

const map = new Map({
  container: "map",
  style: antarcticaBaseStyle,
  center: [-62, -63],
  zoom: 3.2,
});

const minimap = new Map({
  container: "minimap",
  style: antarcticaBaseStyle,
  center: [-62, -63],
  zoom: 3,
  interactive: false,
  attributionControl: false,
});

const { syncProjectionToZoom, syncMinimapState, syncMinimapVisibility } = setupMinimapAndProjection({
  map,
  minimap,
  minimapContainer,
  mapColors,
});

map.addControl(new NavigationControl(), "top-right");

map.on("load", () => {
  const data = tripData;
  const flightsIn = flightsInData;
  const flightsOut = flightsOutData;

  syncProjectionToZoom();
  map.on("zoom", syncProjectionToZoom);
  map.on("styledata", syncProjectionToZoom);

  map.on("move", syncMinimapState);
  map.on("zoom", syncMinimapState);

  map.addSource("trip", { type: "geojson", data });
  map.addSource("flight", { type: "geojson", data: flightsIn });
  map.addSource("flight-out", { type: "geojson", data: flightsOut });
  map.addSource("antarctic-pois", { type: "geojson", data: antarcticPoiData });

  addMapLayers(map, mapColors);

  const interactivePointLayers = [...INTERACTIVE_POINT_LAYER_IDS];

  const pointInteractions = setupPointInteractions(map, interactivePointLayers, POINT_CLICK_ZOOM_BY_LAYER);

  const setFlightLayersVisibility = (isVisible: boolean) => {
    const visibility: "visible" | "none" = isVisible ? "visible" : "none";
    FLIGHT_LAYER_IDS.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    });

    flightLegendItems.forEach((item) => {
      item.style.display = isVisible ? "flex" : "none";
    });

    if (!isVisible) {
      pointInteractions.clearPinnedPopup();
    }
  };
  const { tripBounds, allBounds } = buildTripAndAllBounds(data, flightsIn, flightsOut);

  const getActiveBounds = () => (flightsToggle?.checked === false ? tripBounds : allBounds);

  const fitToActiveBounds = (duration: number) => {
    return fitMapToBounds(map, getActiveBounds(), duration);
  };

  const resetToInitialView = () => {
    if (fitToActiveBounds(900)) {
      return;
    }

    map.easeTo({
      center: [-62, -63],
      zoom: 3.2,
      duration: 900,
      essential: true,
    });
  };

  fitToActiveBounds(0);

  if (resetViewButton) {
    resetViewButton.addEventListener("click", resetToInitialView);
  }

  if (flightsToggle) {
    setFlightLayersVisibility(flightsToggle.checked);
    flightsToggle.addEventListener("change", () => {
      setFlightLayersVisibility(flightsToggle.checked);
      fitToActiveBounds(700);
    });
  }

  syncMinimapVisibility();
});
