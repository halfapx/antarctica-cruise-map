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
const flatMapToggle = document.getElementById("toggle-flat-map") as HTMLInputElement | null;
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

const { setMapProjection, syncMinimapState, syncMinimapVisibility } = setupMinimapAndProjection({
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

  const syncProjectionToToggle = (resetFlatRotation: boolean) => {
    const isFlatMap = flatMapToggle?.checked === true;
    setMapProjection(isFlatMap ? "mercator" : "globe");

    if (!isFlatMap || !resetFlatRotation) {
      return;
    }

    const needsReset = Math.abs(map.getBearing()) > 0.01 || Math.abs(map.getPitch()) > 0.01;
    if (!needsReset) {
      return;
    }

    map.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 450,
      essential: true,
    });
  };

  syncProjectionToToggle(false);
  map.on("styledata", () => syncProjectionToToggle(false));

  map.on("move", syncMinimapState);
  map.on("zoom", syncMinimapState);

  map.addSource("trip", { type: "geojson", data });
  map.addSource("flight", { type: "geojson", data: flightsIn });
  map.addSource("flight-out", { type: "geojson", data: flightsOut });
  map.addSource("antarctic-pois", { type: "geojson", data: antarcticPoiData });

  addMapLayers(map, mapColors);

  const interactivePointLayers = [...INTERACTIVE_POINT_LAYER_IDS];

  const pointInteractions = setupPointInteractions(map, interactivePointLayers, POINT_CLICK_ZOOM_BY_LAYER);

  // Temporary: log coordinates on click for easier POI placement
  // map.on("click", (event) => {
  //   const { lng, lat } = event.lngLat;
  //   console.log(`[${lng.toFixed(7)}, ${lat.toFixed(7)}],`);
  // });

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

  if (flatMapToggle) {
    flatMapToggle.addEventListener("change", () => syncProjectionToToggle(true));
  }

  syncMinimapVisibility();
});
