export type MapColors = {
  track: string;
  flightInLine: string;
  flightInStopover: string;
  flightOutLine: string;
  flightOutStopover: string;
  portCall: string;
  portCallHit: string;
  poi: string;
  poiHit: string;
  pointStroke: string;
  textPrimary: string;
  textHalo: string;
  start: string;
  end: string;
  minimapViewportFill: string;
  minimapViewportOutline: string;
};

export const mapColors: MapColors = {
  track: "#0ea5e9",
  flightInLine: "#8b5cf6",
  flightInStopover: "#c4b5fd",
  flightOutLine: "#6366f1",
  flightOutStopover: "#818cf8",
  portCall: "#f59e0b",
  portCallHit: "#000000",
  poi: "#14b8a6",
  poiHit: "#000000",
  pointStroke: "#ffffff",
  textPrimary: "#111827",
  textHalo: "#ffffff",
  start: "#22c55e",
  end: "#ef4444",
  minimapViewportFill: "#38bdf8",
  minimapViewportOutline: "#0ea5e9",
};

export const applyColorVariables = (colors: MapColors = mapColors) => {
  const rootStyle = document.documentElement.style;
  (Object.entries(colors) as [keyof MapColors, string][]).forEach(([key, value]) => {
    rootStyle.setProperty(`--color-${key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`, value);
  });
};
