1.1JONES/RACHAEL 
1 DL 46T 19JUL Q JFKAMS*SS1 436P 555A 20JUL F /DCDL /E
MOVIES 6**SKY PRIORITY IN C DELTA ONE SVC THIS FLT 
2 DL9355T 20JUL F AMSZAG*SS1 930A 1120A /DCDL /E
OPERATED BY KLM CITYHOPPER 
*DL CODE SHARE-QUOTE OPERATED BY KLMCITYHOPPE AS KL FLT 1939 
ONLINE CONNECTING TRAFFIC ONLY 
3 DL8329K 29JUL S ZAGCDG*SS1 310P 510P /DCDL /E
OPERATED BY AIR FRANCE
*DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 1561
ONLINE CONNECTING TRAFFIC ONLY
4 DL1021K 29JUL S CDGJFK*SS1 710P 925P /DCDL /E 
OPERATED BY AIR FRANCE
*DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 8

Carrier / Flight
Class
Departing
Arriving
Delta Air LinesDL2638
Economy
Miami Intl. (MIA)Miami, United StatesJul 9, 2024 @ 8:10 AM
Detroit Metro Wayne County (DTW)Detroit, United StatesJul 9, 2024 @ 11:14 AM
Delta Air LinesDL2192
Economy
Detroit Metro Wayne County (DTW)Detroit, United StatesJul 9, 2024 @ 12:11 PM
General Mitchell Intl. (MKE)Milwaukee, United StatesJul 9, 2024 @ 12:22 PM

export interface NormalizedPNR {
  passengers: Passenger[];

  segments: FlightSegment[];

  metadata: {
    pnr?: string;
    source: "amadeus";
  };

  warnings: string[];
}

export interface Passenger {
  firstName: string;
  lastName: string;
  title?: string;
}

export interface FlightSegment {
  segmentNumber: number;

  marketingCarrier: {
    code: string;
    name?: string;
  };

  flightNumber: string;

  bookingClass: string;
  cabin?: string;

  departure: {
    airport: string;
    airportName?: string;
    city?: string;
    country?: string;
    date: string;
    time: string;
  };

  arrival: {
    airport: string;
    airportName?: string;
    city?: string;
    country?: string;
    date: string;
    time: string;
  };

  status: {
    code: string;
    quantity?: number;
    description?: string;
  };

  operatingCarrier?: {
    code: string;
    name?: string;
  };

  operatingFlightNumber?: string;

  codeshare: boolean;

  durationMinutes?: number;

  remarks: string[];
}

Later, if you add:

parsers/
├── amadeus/
├── sabre/
└── galileo/

all of them must return the same NormalizedPNR.

Your Amadeus parser

For your current input:

1.1JONES/RACHAEL 
1 DL 46T 19JUL Q JFKAMS*SS1 436P 555A 20JUL F /DCDL /E
MOVIES 6**SKY PRIORITY IN C DELTA ONE SVC THIS FLT 
2 DL9355T 20JUL F AMSZAG*SS1 930A 1120A /DCDL /E
OPERATED BY KLM CITYHOPPER 
*DL CODE SHARE-QUOTE OPERATED BY KLMCITYHOPPE AS KL FLT 1939 
ONLINE CONNECTING TRAFFIC ONLY 
3 DL8329K 29JUL S ZAGCDG*SS1 310P 510P /DCDL /E
OPERATED BY AIR FRANCE
*DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 1561
ONLINE CONNECTING TRAFFIC ONLY
4 DL1021K 29JUL S CDGJFK*SS1 710P 925P /DCDL /E 
OPERATED BY AIR FRANCE
*DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 8

your parser should produce something like:

{
  "metadata": {
    "source": "amadeus"
  },
  "passengers": [
    {
      "firstName": "RACHAEL",
      "lastName": "JONES"
    }
  ],
  "segments": [
    {
      "segmentNumber": 1,
      "marketingCarrier": {
        "code": "DL",
        "name": "Delta Air Lines"
      },
      "flightNumber": "46",
      "bookingClass": "T",
      "departure": {
        "airport": "JFK",
        "date": "19JUL",
        "time": "436P"
      },
      "arrival": {
        "airport": "AMS",
        "date": "20JUL",
        "time": "555A"
      },
      "status": {
        "code": "SS",
        "quantity": 1
      },
      "codeshare": false,
      "remarks": [
        "MOVIES 6",
        "SKY PRIORITY IN C",
        "DELTA ONE SVC THIS FLT"
      ]
    }
  ],
  "warnings": []
}
Then Formatter

The formatter receives only normalized JSON:

formatItinerary(normalizedPNR)

and produces:

Carrier / Flight
Class
Departing
Arriving

For example:

Delta Air Lines DL46

Economy

John F. Kennedy International Airport (JFK)
New York, United States
19 Jul @ 4:36 PM

Amsterdam Airport Schiphol (AMS)
Amsterdam, Netherlands
20 Jul @ 5:55 AM
One important improvement

Don't put airport/airline lookup inside the Amadeus parser.

Bad:

Amadeus parser
   ↓
parse JFK
   ↓
find airport
   ↓
format airport

Instead:

Raw Amadeus
     ↓
Amadeus Parser
     ↓
Normalized JSON
     ↓
Enrichment
 ┌──────────────┐
 │ Airline data │
 │ Airport data │
 │ Cabin data   │
 │ Duration     │
 │ Codeshare    │
 └──────────────┘
     ↓
Formatter

This keeps it reusable.

And for your project

I'd make the main function:

parsePNR(rawText, "amadeus")

Internally:

const parser = getParser("amadeus");

const parsed = parser.parse(rawText);

const normalized = normalize(parsed);

const enriched = enrich(normalized);

return format(enriched);

Later:

parsePNR(rawText, "sabre");



const AIRLINES = {
  DL: "Delta Air Lines",
  AF: "Air France",
  KL: "KLM",
  EK: "Emirates",
  QR: "Qatar Airways",
  TK: "Turkish Airlines",
  LH: "Lufthansa",
};

const STATUS = {
  HK: "Confirmed",
  SS: "Sold",
  NN: "Need confirmation",
  HL: "Waitlisted",
  HX: "Cancelled",
  UC: "Unable to confirm",
  UN: "Unable",
};

function normalizeText(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function parsePassenger(line) {
  // Example:
  // 1.1JONES/RACHAEL
  // 1.1SMITH/JOHN MR

  const match = line.match(
    /^\d+\.\d+([A-Z' -]+)\/([A-Z' -]+?)(?:\s+(MR|MRS|MS|MISS|CHD|INF))?$/
  );

  if (!match) return null;

  return {
    lastName: match[1].trim(),
    firstName: match[2].trim(),
    title: match[3] || undefined
  };
}

function parseTime(value) {
  const match = value.match(/^(\d{1,4})([AP])$/i);

  if (!match) return null;

  let digits = match[1];
  const ampm = match[2].toUpperCase();

  let hour;
  let minute;

  if (digits.length <= 2) {
    hour = Number(digits);
    minute = 0;
  } else {
    minute = Number(digits.slice(-2));
    hour = Number(digits.slice(0, -2));
  }

  if (hour === 12) {
    hour = 0;
  }

  if (ampm === "P") {
    hour += 12;
  }

  return {
    raw: value,
    hour,
    minute,
    formatted: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  };
}

function parseStatus(value) {
  const match = value.match(/^([A-Z]{2})(\d+)?$/);

  if (!match) {
    return {
      code: value,
      description: undefined
    };
  }

  return {
    code: match[1],
    quantity: match[2] ? Number(match[2]) : undefined,
    description: STATUS[match[1]] || "Unknown"
  };
}

function parseDate(value, year = new Date().getFullYear()) {
  const match = value.match(/^(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/);

  if (!match) return null;

  const months = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11
  };

  const date = new Date(
    Date.UTC(
      year,
      months[match[2]],
      Number(match[1])
    )
  );

  return date.toISOString().slice(0, 10);
}

function parseFlightLine(line) {
  /*
    Example:

    1 DL 46T 19JUL Q JFKAMS*SS1 436P 555A 20JUL F /DCDL /E

    2 DL9355T 20JUL F AMSZAG*SS1 930A 1120A /DCDL /E
  */

  let match = line.match(
    /^(\d+)\s+([A-Z0-9]{2,3})\s*(\d+[A-Z]?)\s+(\d{1,2}[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]{2}\d+)\s+(\d{3,4}[AP])\s+(\d{3,4}[AP])(?:\s+(\d{1,2}[A-Z]{3}))?/i
  );

  /*
    Alternative Amadeus style:

    2 DL9355T 20JUL F AMSZAG*SS1 930A 1120A
  */

  if (!match) {
    match = line.match(
      /^(\d+)\s+([A-Z0-9]{2,3})(\d+[A-Z]?)\s+(\d{1,2}[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]{2}\d+)\s+(\d{3,4}[AP])\s+(\d{3,4}[AP])(?:\s+(\d{1,2}[A-Z]{3}))?/i
    );
  }

  if (!match) return null;

  const [
    ,
    segmentNumber,
    airline,
    flightNumber,
    departureDate,
    bookingClass,
    departureAirport,
    arrivalAirport,
    status,
    departureTime,
    arrivalTime,
    arrivalDate
  ] = match;

  return {
    segmentNumber: Number(segmentNumber),

    marketingCarrier: {
      code: airline.toUpperCase(),
      name: AIRLINES[airline.toUpperCase()] || undefined
    },

    flightNumber: flightNumber.replace(/[A-Z]$/, ""),

    bookingClass: flightNumber.match(/[A-Z]$/)
      ? flightNumber.slice(-1)
      : bookingClass,

    departure: {
      airport: departureAirport.toUpperCase(),
      date: parseDate(departureDate),
      time: parseTime(departureTime)
    },

    arrival: {
      airport: arrivalAirport.toUpperCase(),
      date: arrivalDate
        ? parseDate(arrivalDate)
        : parseDate(departureDate),
      time: parseTime(arrivalTime)
    },

    status: parseStatus(status),

    codeshare: false,

    operatingCarrier: undefined,
    operatingFlightNumber: undefined,

    remarks: []
  };
}

function parseOperatingCarrier(line, previousSegment) {
  if (!previousSegment) return;

  const match = line.match(
    /OPERATED BY\s+(.+)/i
  );

  if (!match) return;

  const name = match[1]
    .replace(/\s+/g, " ")
    .trim();

  previousSegment.operatingCarrier = {
    name
  };

  previousSegment.codeshare = true;
}

function parseCodeshare(line, previousSegment) {
  if (!previousSegment) return;

  /*
    Example:

    *DL CODE SHARE-QUOTE OPERATED BY KLMCITYHOPPE AS KL FLT 1939
  */

  let match = line.match(
    /OPERATED BY\s+.+?\s+AS\s+([A-Z]{2,3})\s+FLT\s+(\d+)/i
  );

  if (match) {
    previousSegment.operatingCarrier = {
      code: match[1].toUpperCase(),
      name:
        AIRLINES[match[1].toUpperCase()] || undefined
    };

    previousSegment.operatingFlightNumber = match[2];

    previousSegment.codeshare = true;

    return;
  }

  /*
    Example:

    *DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 1561
  */

  match = line.match(
    /AS\s+([A-Z]{2,3})\s+FLT\s+(\d+)/i
  );

  if (match) {
    previousSegment.operatingCarrier = {
      code: match[1].toUpperCase(),
      name:
        AIRLINES[match[1].toUpperCase()] || undefined
    };

    previousSegment.operatingFlightNumber = match[2];

    previousSegment.codeshare = true;
  }
}

function calculateDuration(segment) {
  if (!segment.departure.date || !segment.arrival.date) {
    return null;
  }

  const departure = new Date(
    `${segment.departure.date}T${segment.departure.time.formatted}:00Z`
  );

  const arrival = new Date(
    `${segment.arrival.date}T${segment.arrival.time.formatted}:00Z`
  );

  const minutes =
    Math.round((arrival - departure) / 60000);

  if (minutes < 0) return null;

  return minutes;
}

function parseRemarks(lines, segment) {
  const remarks = [];

  for (const line of lines) {
    if (
      line.startsWith("OPERATED BY") ||
      line.startsWith("*DL CODE")
    ) {
      continue;
    }

    if (
      line.includes("ONLINE CONNECTING TRAFFIC") ||
      line.includes("SKY PRIORITY") ||
      line.includes("DELTA ONE") ||
      line.includes("MOVIES")
    ) {
      remarks.push(line);
    }
  }

  segment.remarks.push(...remarks);
}

function parseAmadeusPNR(rawText) {
  const lines = normalizeText(rawText);

  const result = {
    metadata: {
      source: "amadeus"
    },

    passengers: [],

    segments: [],

    warnings: []
  };

  let currentSegment = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --------------------------
    // Passenger
    // --------------------------

    if (/^\d+\.\d+/.test(line)) {
      const passenger = parsePassenger(line);

      if (passenger) {
        result.passengers.push(passenger);
        continue;
      }
    }

    // --------------------------
    // Flight Segment
    // --------------------------

    const segment = parseFlightLine(line);

    if (segment) {
      currentSegment = segment;

      result.segments.push(segment);

      continue;
    }

    // --------------------------
    // Operating Carrier
    // --------------------------

    if (/^OPERATED BY/i.test(line)) {
      parseOperatingCarrier(
        line,
        currentSegment
      );

      continue;
    }

    // --------------------------
    // Codeshare
    // --------------------------

    if (
      line.startsWith("*") &&
      /CODE SHARE/i.test(line)
    ) {
      parseCodeshare(
        line,
        currentSegment
      );

      continue;
    }

    // --------------------------
    // Other remarks
    // --------------------------

    if (currentSegment) {
      parseRemarks(
        [line],
        currentSegment
      );
    }
  }

  // Calculate durations

  for (const segment of result.segments) {
    segment.durationMinutes =
      calculateDuration(segment);
  }

  // Validation

  if (result.passengers.length === 0) {
    result.warnings.push(
      "No passenger information detected"
    );
  }

  if (result.segments.length === 0) {
    result.warnings.push(
      "No flight segments detected"
    );
  }

  return result;
}

module.exports = {
  parseAmadeusPNR
};