import { buildFlightCollection, type FlightStop } from "./flightBuilder";

export const charterFlightStops: FlightStop[] = [
  {
    name: "Presidente Carlos Ibáñez del Campo International Airport",
    country: "Chile",
    airportCode: "PUQ",
    coordinates: [-70.8546, -53.0026],
  },
  {
    name: "Teniente R. Marsh Airport",
    country: "Antarctica",
    airportCode: "SCRM",
    coordinates: [-58.9867, -62.1906],
  },
];

export const charterFlightData = buildFlightCollection("flight", charterFlightStops);
