import { buildFlightCollection, type FlightStop } from "./flightBuilder";

export const flightsOutStops: FlightStop[] = [
  { name: "Ushuaia Airport", country: "Argentina", airportCode: "USH", coordinates: [-68.2948, -54.8433] },
  { name: "Aeroparque Jorge Newbery", country: "Argentina", airportCode: "AEP", coordinates: [-58.4156, -34.5592] },
  { name: "Ezeiza International Airport", country: "Argentina", airportCode: "EZE", coordinates: [-58.5358, -34.8222] },
  {
    name: "Adolfo Suárez Madrid–Barajas Airport",
    country: "Spain",
    airportCode: "MAD",
    coordinates: [-3.5695, 40.4983],
  },
  { name: "Zürich Airport", country: "Switzerland", airportCode: "ZRH", coordinates: [8.5492, 47.4647] },
];

export const flightsOutData = buildFlightCollection("flight_out", flightsOutStops);
