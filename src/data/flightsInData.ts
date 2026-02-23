import { buildFlightCollection, type FlightStop } from "./flightBuilder";

export const flightsInStops: FlightStop[] = [
  { name: "Zürich Airport", country: "Switzerland", airportCode: "ZRH", coordinates: [8.5492, 47.4647] },
  {
    name: "Adolfo Suárez Madrid–Barajas Airport",
    country: "Spain",
    airportCode: "MAD",
    coordinates: [-3.5695, 40.4983],
  },
  { name: "Santiago International Airport", country: "Chile", airportCode: "SCL", coordinates: [-70.7944, -33.393] },
  {
    name: "Presidente Carlos Ibáñez del Campo International Airport",
    country: "Chile",
    airportCode: "PUQ",
    coordinates: [-70.8546, -53.0026],
  },
  { name: "Teniente R. Marsh Airport", country: "Antarctica", airportCode: "SCRM", coordinates: [-58.9867, -62.1906] },
];

export const flightsInData = buildFlightCollection("flight", flightsInStops);
