import { Popup, type Map } from "maplibre-gl/dist/maplibre-gl-csp-dev.js";
import type { Feature, Geometry } from "geojson";
import { isPointCoordinates } from "./coordinates";

type PointFeature = Feature<Geometry, Record<string, unknown>> & {
  geometry: { type: "Point"; coordinates: [number, number] };
};

type LayerEvent = {
  features?: unknown[];
  point: { x: number; y: number };
};

const getPointFeatureFromEvent = (event: LayerEvent) => {
  const feature = event.features?.[0] as Feature<Geometry, Record<string, unknown>> | undefined;
  if (!feature || feature.geometry?.type !== "Point" || !isPointCoordinates(feature.geometry.coordinates)) {
    return undefined;
  }

  return feature as PointFeature;
};

const getPopupHtml = (feature: Feature<Geometry, Record<string, unknown>>) => {
  const props = feature.properties ?? {};
  const title = (props.Name as string) || (props.Port_Name as string) || "Stop";
  const type = (props.Feature_type as string) || (props.point_type as string) || "";
  const typeHtml = type ? `<br/>Type: ${type}` : "";
  const country = (props.Country as string) || (props.Country_code as string) || "";
  const countryHtml = country ? `<br/>Country: ${country}` : "";
  const airportCode = props.Airport_code ? `<br/>Airport: ${props.Airport_code}` : "";
  return `<strong>${title}</strong>${typeHtml}${countryHtml}${airportCode}`;
};

const showPopupForPointFeature = (
  map: Map,
  popup: Popup,
  feature: Feature<Geometry, Record<string, unknown>>,
) => {
  if (!feature || feature.geometry?.type !== "Point" || !isPointCoordinates(feature.geometry.coordinates)) {
    return;
  }

  popup.setLngLat(feature.geometry.coordinates).setHTML(getPopupHtml(feature)).addTo(map);
};

export const setupPointInteractions = (
  map: Map,
  interactivePointLayers: string[],
  clickZoomByLayer: Record<string, number>,
) => {
  const popup = new Popup({ closeButton: false, closeOnClick: false });
  let isPopupPinned = false;

  const focusPointFeature = (feature: PointFeature, zoom: number) => {
    isPopupPinned = true;
    showPopupForPointFeature(map, popup, feature);

    map.easeTo({
      center: feature.geometry.coordinates,
      zoom,
      duration: 900,
      essential: true,
    });
  };

  interactivePointLayers.forEach((layerId) => {
    map.on("mouseenter", layerId, (event) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = getPointFeatureFromEvent(event as LayerEvent);
      if (!feature || isPopupPinned) {
        return;
      }
      showPopupForPointFeature(map, popup, feature);
    });

    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
      if (!isPopupPinned) {
        popup.remove();
      }
    });
  });

  Object.entries(clickZoomByLayer).forEach(([layerId, zoom]) => {
    map.on("click", layerId, (event) => {
      const feature = getPointFeatureFromEvent(event as LayerEvent);
      if (!feature) {
        return;
      }

      focusPointFeature(feature, zoom);
    });
  });

  map.on("click", (event) => {
    const featuresAtClick = map.queryRenderedFeatures(event.point, {
      layers: interactivePointLayers,
    });
    if (featuresAtClick.length > 0) {
      return;
    }

    isPopupPinned = false;
    popup.remove();
  });

  return {
    clearPinnedPopup: () => {
      isPopupPinned = false;
      popup.remove();
    },
  };
};
