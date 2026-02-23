import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const AIRPORTS_URL = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv";
const COUNTRIES_URL = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/countries.csv";
const OUTPUT_PATH = resolve(process.cwd(), "src/data/airports.ts");

const MUST_INCLUDE_CODES = new Set(["SCRM", "PUQ", "USH", "AEP", "EZE", "SCL", "MAD", "ZRH"]);

const parseCsv = (text) => {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (char !== "\r") {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  const [header, ...dataRows] = rows;
  return dataRows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(header.map((key, rowIndex) => [key, row[rowIndex] ?? ""])));
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const run = async () => {
  const [airportsResponse, countriesResponse] = await Promise.all([fetch(AIRPORTS_URL), fetch(COUNTRIES_URL)]);

  if (!airportsResponse.ok) {
    throw new Error(`Failed to fetch airports CSV (${airportsResponse.status})`);
  }

  if (!countriesResponse.ok) {
    throw new Error(`Failed to fetch countries CSV (${countriesResponse.status})`);
  }

  const [airportsCsv, countriesCsv] = await Promise.all([airportsResponse.text(), countriesResponse.text()]);
  const airports = parseCsv(airportsCsv);
  const countries = parseCsv(countriesCsv);

  const countryByCode = new Map(countries.map((country) => [country.code, country.name]));

  const options = airports
    .map((airport) => {
      const code = airport.iata_code?.trim();
      if (!code) {
        return undefined;
      }

      const latitude = toNumber(airport.latitude_deg);
      const longitude = toNumber(airport.longitude_deg);
      if (latitude === undefined || longitude === undefined) {
        return undefined;
      }

      const isLarge = airport.type === "large_airport";
      const isMedium = airport.type === "medium_airport";
      const isScheduled = airport.scheduled_service === "yes";
      const shouldIncludeByType = (isLarge || isMedium) && isScheduled;
      const shouldIncludeByCode = MUST_INCLUDE_CODES.has(code);

      if (!shouldIncludeByType && !shouldIncludeByCode) {
        return undefined;
      }

      const country = countryByCode.get(airport.iso_country) ?? airport.iso_country ?? "Unknown";

      return {
        code,
        name: airport.name,
        country,
        coordinates: [Number(longitude.toFixed(4)), Number(latitude.toFixed(4))],
      };
    })
    .filter((airport) => airport !== undefined)
    .sort((left, right) => {
      const countryCmp = left.country.localeCompare(right.country);
      if (countryCmp !== 0) return countryCmp;
      return left.code.localeCompare(right.code);
    });

  const output = `export type AirportOption = {\n  code: string;\n  name: string;\n  country: string;\n  coordinates: [number, number];\n};\n\n// Generated from OurAirports data via scripts/update-airports.mjs\nexport const majorAirports: AirportOption[] = ${JSON.stringify(options, null, 2)};\n`;

  await writeFile(OUTPUT_PATH, output, "utf8");
  console.log(`Wrote ${options.length} airports to ${OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
