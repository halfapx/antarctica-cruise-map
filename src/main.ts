import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource } from "maplibre-gl/dist/maplibre-gl-csp-dev.js";
import "maplibre-gl/dist/maplibre-gl.css";
import accessibleAutocomplete from "accessible-autocomplete";
import "accessible-autocomplete/dist/accessible-autocomplete.min.css";
import "./style.css";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker-dev.js?url";
import {
  antarcticPoiData,
  charterFlightData,
  flightsInStops,
  flightsOutStops,
  majorAirports,
  tripData,
} from "./data";
import { buildFlightCollection, type FlightStop } from "./data/flightBuilder";
import {
  applyColorVariables,
  addMapLayers,
  buildTripAndAllBounds,
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
const flightDrawer = document.getElementById("flight-drawer") as HTMLElement | null;
const flightDrawerToggle = document.getElementById("flight-drawer-toggle") as HTMLButtonElement | null;
const flatMapToggle = document.getElementById("toggle-flat-map") as HTMLInputElement | null;
const renderFlightsInToggle = document.getElementById("render-flights-in") as HTMLInputElement | null;
const renderFlightsOutToggle = document.getElementById("render-flights-out") as HTMLInputElement | null;
const flightInStopCountInput = document.getElementById("flight-in-stop-count") as HTMLInputElement | null;
const flightOutStopCountInput = document.getElementById("flight-out-stop-count") as HTMLInputElement | null;
const flightInStopSelectsContainer = document.getElementById("flight-in-stop-selects") as HTMLDivElement | null;
const flightOutStopSelectsContainer = document.getElementById("flight-out-stop-selects") as HTMLDivElement | null;
const applyFlightInEditorButton = document.getElementById("apply-flight-in-editor") as HTMLButtonElement | null;
const applyFlightOutEditorButton = document.getElementById("apply-flight-out-editor") as HTMLButtonElement | null;
const flightEditorStatus = document.getElementById("flight-editor-status") as HTMLParagraphElement | null;

const MIN_EDITOR_STOPOVERS = 0;
const MAX_EDITOR_STOPOVERS = 8;

const airportByCode = new globalThis.Map(majorAirports.map((airport) => [airport.code, airport]));

if (flightDrawer && flightDrawerToggle) {
  const setDrawerExpanded = (isExpanded: boolean) => {
    flightDrawer.classList.toggle("is-collapsed", !isExpanded);
    flightDrawerToggle.setAttribute("aria-expanded", String(isExpanded));
    flightDrawerToggle.setAttribute("aria-label", isExpanded ? "Collapse controls" : "Expand controls");
    flightDrawerToggle.textContent = "⚙";
  };

  setDrawerExpanded(false);

  flightDrawerToggle.addEventListener("click", () => {
    const isExpanded = flightDrawerToggle.getAttribute("aria-expanded") === "true";
    setDrawerExpanded(!isExpanded);
  });
}

const cloneStop = (stop: FlightStop): FlightStop => ({
  ...stop,
  coordinates: [stop.coordinates[0], stop.coordinates[1]],
});

const minimapContainer = document.createElement("div");
minimapContainer.id = "minimap";
minimapContainer.className = "minimap minimap-hidden";
document.body.appendChild(minimapContainer);

const antarcticaBaseStyle = "https://tiles.openfreemap.org/styles/bright";

const map = new MapLibreMap({
  container: "map",
  style: antarcticaBaseStyle,
  center: [-62, -63],
  zoom: 3.2,
});

const minimap = new MapLibreMap({
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
  let flightsInEditableStops = flightsInStops.map(cloneStop);
  let flightsOutEditableStops = flightsOutStops.map(cloneStop);
  let flightsIn = buildFlightCollection("flight", flightsInEditableStops);
  const charterFlight = charterFlightData;
  let flightsOut = buildFlightCollection("flight_out", flightsOutEditableStops);

  const normalizeStopoverCount = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) {
      return fallback;
    }

    return Math.max(MIN_EDITOR_STOPOVERS, Math.min(MAX_EDITOR_STOPOVERS, Math.trunc(value)));
  };

  const getStopsForRoute = (route: "flight" | "flight_out") =>
    route === "flight" ? flightsInEditableStops : flightsOutEditableStops;

  const getStopCountInputForRoute = (route: "flight" | "flight_out") =>
    route === "flight" ? flightInStopCountInput : flightOutStopCountInput;

  const getStopContainerForRoute = (route: "flight" | "flight_out") =>
    route === "flight" ? flightInStopSelectsContainer : flightOutStopSelectsContainer;

  const getRouteRenderEnabled = (route: "flight" | "flight_out") =>
    route === "flight" ? renderFlightsInToggle?.checked !== false : renderFlightsOutToggle?.checked !== false;

  const setRouteRenderVisibility = (route: "flight" | "flight_out", isVisible: boolean) => {
    const visibility: "visible" | "none" = isVisible ? "visible" : "none";
    const layerIds =
      route === "flight"
        ? ["flight-track", "flight-points", "flight-point-labels"]
        : ["flight-out-track", "flight-out-points", "flight-out-point-labels"];

    layerIds.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    });
  };

  const getAirportLabel = (airportCode: string) => {
    const airport = airportByCode.get(airportCode);
    return airport ? `${airport.code} — ${airport.name}` : airportCode;
  };

  const readDraftStopCodes = (route: "flight" | "flight_out") => {
    const container = getStopContainerForRoute(route);
    if (!container) {
      return [] as string[];
    }

    return Array.from(container.querySelectorAll("select")).map((select) => select.value);
  };

  const renderFlightStopSelectors = (route: "flight" | "flight_out", useDraftValues = true) => {
    const stopCountInput = getStopCountInputForRoute(route);
    const stopSelectsContainer = getStopContainerForRoute(route);
    if (!stopCountInput || !stopSelectsContainer) {
      return;
    }

    const routeStops = getStopsForRoute(route);
    const draftCodes = useDraftValues ? readDraftStopCodes(route) : [];
    const fallbackCode = majorAirports[0]?.code ?? "";
    const originCode = (useDraftValues ? draftCodes[0] : undefined) ?? routeStops[0]?.airportCode ?? fallbackCode;
    const destinationCode =
      (useDraftValues ? draftCodes[draftCodes.length - 1] : undefined) ??
      routeStops[routeStops.length - 1]?.airportCode ??
      originCode;

    const existingStopoverCodes = routeStops.slice(1, -1).map((stop) => stop.airportCode);
    const draftStopoverCodes = useDraftValues ? draftCodes.slice(1, -1) : [];

    const stopoverCount = normalizeStopoverCount(
      Number(stopCountInput.value),
      Math.max(0, routeStops.length - 2),
    );
    stopCountInput.value = String(stopoverCount);

    const stopoverCodes = Array.from({ length: stopoverCount }, (_, index) => {
      return draftStopoverCodes[index] ?? existingStopoverCodes[index] ?? destinationCode;
    });

    const stopCodes = [originCode, ...stopoverCodes, destinationCode];

    stopSelectsContainer.innerHTML = "";

    stopCodes.forEach((selectedCode, index) => {
      const row = document.createElement("div");
      row.className = "flight-stop-row";

      const isOrigin = index === 0;
      const isDestination = index === stopCodes.length - 1;
      const isFixedFlightsOutOrigin = route === "flight_out" && isOrigin;
      const isFixedFlightsInDestination = route === "flight" && isDestination;
      const isFixedEndpoint = isFixedFlightsOutOrigin || isFixedFlightsInDestination;

      const role = isOrigin ? "Origin" : isDestination ? "Destination" : `Stop ${index}`;
      const roleLabel = document.createElement("span");
      roleLabel.className = "flight-stop-label";
      roleLabel.textContent = role;
      row.appendChild(roleLabel);

      const select = document.createElement("select");
      const selectId = `flight-editor-${route}-${index}`;
      select.id = selectId;
      select.name = selectId;
      select.setAttribute("aria-label", `${role} airport`);

      majorAirports.forEach((airport) => {
        const option = document.createElement("option");
        option.value = airport.code;
        option.textContent = `${airport.code} — ${airport.name}`;
        if (airport.code === selectedCode) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      if (isFixedEndpoint) {
        roleLabel.textContent = `${role} (fixed)`;
        const readonlyValue = document.createElement("span");
        readonlyValue.className = "flight-stop-readonly";
        readonlyValue.textContent = getAirportLabel(selectedCode);
        row.appendChild(readonlyValue);

        select.style.display = "none";
        select.setAttribute("aria-hidden", "true");
        row.appendChild(select);
      } else {
        row.appendChild(select);
        accessibleAutocomplete.enhanceSelectElement({
          selectElement: select,
          autoselect: true,
          showAllValues: false,
          defaultValue: getAirportLabel(selectedCode),
        });
      }

      stopSelectsContainer.appendChild(row);
    });
  };

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
  map.addSource("charter-flight", { type: "geojson", data: charterFlight });
  map.addSource("flight-out", { type: "geojson", data: flightsOut });
  map.addSource("antarctic-pois", { type: "geojson", data: antarcticPoiData });

  addMapLayers(map, mapColors);

  const interactivePointLayers = [...INTERACTIVE_POINT_LAYER_IDS];

  setupPointInteractions(map, interactivePointLayers, POINT_CLICK_ZOOM_BY_LAYER);

  // Temporary: log coordinates on click for easier POI placement
  // map.on("click", (event) => {
  //   const { lng, lat } = event.lngLat;
  //   console.log(`[${lng.toFixed(7)}, ${lat.toFixed(7)}],`);
  // });

  const fitToActiveBounds = (duration: number) => {
    const emptyCollection = { type: "FeatureCollection", features: [] } as typeof flightsIn;
    const activeFlightsIn = getRouteRenderEnabled("flight") ? flightsIn : emptyCollection;
    const activeFlightsOut = getRouteRenderEnabled("flight_out") ? flightsOut : emptyCollection;
    const { allBounds } = buildTripAndAllBounds(data, activeFlightsIn, activeFlightsOut, charterFlight);
    return fitMapToBounds(map, allBounds, duration);
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

  if (flatMapToggle) {
    flatMapToggle.addEventListener("change", () => syncProjectionToToggle(true));
  }

  const applyRouteEditor = (route: "flight" | "flight_out") => {
    const selectedCodes = readDraftStopCodes(route);
    if (selectedCodes.length < 2) {
      return;
    }

    const selectedStops = selectedCodes
      .map((code) => airportByCode.get(code))
      .filter((airport): airport is NonNullable<typeof airport> => airport !== undefined)
      .map((airport) => ({
        name: airport.name,
        country: airport.country,
        airportCode: airport.code,
        coordinates: [airport.coordinates[0], airport.coordinates[1]] as [number, number],
      }));

    if (selectedStops.length !== selectedCodes.length) {
      if (flightEditorStatus) {
        flightEditorStatus.textContent = "Some selected airports were not recognized.";
      }
      return;
    }

    if (route === "flight") {
      flightsInEditableStops = selectedStops;
      flightsIn = buildFlightCollection("flight", flightsInEditableStops);
      const source = map.getSource("flight") as GeoJSONSource | undefined;
      source?.setData(flightsIn);
    } else {
      flightsOutEditableStops = selectedStops;
      flightsOut = buildFlightCollection("flight_out", flightsOutEditableStops);
      const source = map.getSource("flight-out") as GeoJSONSource | undefined;
      source?.setData(flightsOut);
    }

    fitToActiveBounds(700);

    if (flightEditorStatus) {
      const routeLabel = route === "flight" ? "Flights in" : "Flights out";
      const origin = getAirportLabel(selectedCodes[0]);
      const destination = getAirportLabel(selectedCodes[selectedCodes.length - 1]);
      flightEditorStatus.textContent = `${routeLabel} updated: ${origin} → ${destination}.`;
    }
  };

  const initializeEditorForRoute = (route: "flight" | "flight_out") => {
    const input = getStopCountInputForRoute(route);
    const stops = getStopsForRoute(route);
    if (input) {
      input.value = String(Math.max(0, stops.length - 2));
    }
    renderFlightStopSelectors(route, false);
    setRouteRenderVisibility(route, getRouteRenderEnabled(route));
  };

  initializeEditorForRoute("flight");
  initializeEditorForRoute("flight_out");

  flightInStopCountInput?.addEventListener("change", () => renderFlightStopSelectors("flight", true));
  flightOutStopCountInput?.addEventListener("change", () => renderFlightStopSelectors("flight_out", true));

  applyFlightInEditorButton?.addEventListener("click", () => applyRouteEditor("flight"));
  applyFlightOutEditorButton?.addEventListener("click", () => applyRouteEditor("flight_out"));

  renderFlightsInToggle?.addEventListener("change", () => {
    setRouteRenderVisibility("flight", renderFlightsInToggle.checked);
    fitToActiveBounds(700);
  });

  renderFlightsOutToggle?.addEventListener("change", () => {
    setRouteRenderVisibility("flight_out", renderFlightsOutToggle.checked);
    fitToActiveBounds(700);
  });

  syncMinimapVisibility();
});
