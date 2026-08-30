import { FlightSegment, NormalizedPNR, Passenger } from '../types';

const STATUS_DESCRIPTIONS: Record<string, string> = {
  HK: 'Confirmed',
  SS: 'Sold',
  NN: 'Need confirmation',
  HL: 'Waitlisted',
  HX: 'Cancelled',
  UC: 'Unable to confirm',
  UN: 'Unable',
  DK: 'Confirmed',
  TK: 'Confirmed change',
};

function normalizeText(raw: string): string[] {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePassenger(line: string): Passenger | null {
  // Example:
  // 1.1JONES/RACHAEL
  // 1.1SMITH/JOHN MR
  const match = line.match(
    /^\d+\.\d+([A-Z' -]+)\/([A-Z' -]+?)(?:\s+(MR|MRS|MS|MISS|CHD|INF))?$/i
  );

  if (match) {
    return {
      lastName: match[1].trim().toUpperCase(),
      firstName: match[2].trim().toUpperCase(),
      title: match[3] ? match[3].toUpperCase() : undefined,
    };
  }

  // Fallback for names without 1.1 e.g. "JONES/RACHAEL MR" or "1.JONES/RACHAEL"
  const altMatch = line.match(
    /^(?:\d+\.|\d+\s+)?([A-Z' -]+)\/([A-Z' -]+?)(?:\s+(MR|MRS|MS|MISS|CHD|INF))?$/i
  );
  if (altMatch && !line.includes('*') && !line.includes('/E')) {
    return {
      lastName: altMatch[1].trim().toUpperCase(),
      firstName: altMatch[2].trim().toUpperCase(),
      title: altMatch[3] ? altMatch[3].toUpperCase() : undefined,
    };
  }

  return null;
}

function parseTime(value: string): { raw: string; hour: number; minute: number; formatted: string } | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,4})([AP])$/i);

  if (!match) {
    // 24h format fallback e.g. 1430 or 0800
    const match24 = value.match(/^(\d{1,2}):?(\d{2})$/);
    if (match24) {
      const hour = Number(match24[1]);
      const minute = Number(match24[2]);
      return {
        raw: value,
        hour,
        minute,
        formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      };
    }
    return null;
  }

  const digits = match[1];
  const ampm = match[2].toUpperCase();

  let hour: number;
  let minute: number;

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

  if (ampm === 'P') {
    hour += 12;
  }

  return {
    raw: value,
    hour,
    minute,
    formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

function parseStatus(value: string): { code: string; quantity?: number; description?: string } {
  const match = value.match(/^([A-Z]{2})(\d+)?$/i);

  if (!match) {
    return {
      code: value.toUpperCase(),
      description: undefined,
    };
  }

  const code = match[1].toUpperCase();
  return {
    code,
    quantity: match[2] ? Number(match[2]) : undefined,
    description: STATUS_DESCRIPTIONS[code] || 'Unknown',
  };
}

function parseDate(value: string, year = new Date().getFullYear()): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i);

  if (!match) return null;

  const months: Record<string, number> = {
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
    DEC: 11,
  };

  const day = Number(match[1]);
  const month = months[match[2].toUpperCase()];

  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString().slice(0, 10);
}

function parseFlightLine(line: string): FlightSegment | null {
  /*
    Example 1 (separated airline & flight):
    1 DL 46T 19JUL Q JFKAMS*SS1 436P 555A 20JUL F /DCDL /E

    Example 2 (attached airline & flight):
    2 DL9355T 20JUL F AMSZAG*SS1 930A 1120A /DCDL /E
  */

  let match = line.match(
    /^(\d+)\s+([A-Z0-9]{2,3})\s*(\d+[A-Z]?)\s+(\d{1,2}[A-Z]{3})\s+([A-Z0-9])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]{2}\d*)\s+(\d{3,4}[AP]|\d{1,2}:\d{2})\s+(\d{3,4}[AP]|\d{1,2}:\d{2})(?:\s+(\d{1,2}[A-Z]{3}))?/i
  );

  if (!match) {
    match = line.match(
      /^(\d+)\s+([A-Z0-9]{2,3})(\d+[A-Z]?)\s+(\d{1,2}[A-Z]{3})\s+([A-Z0-9])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]{2}\d*)\s+(\d{3,4}[AP]|\d{1,2}:\d{2})\s+(\d{3,4}[AP]|\d{1,2}:\d{2})(?:\s+(\d{1,2}[A-Z]{3}))?/i
    );
  }

  // Also support segments with spaces between origin and destination or HK1 instead of *SS1
  if (!match) {
    match = line.match(
      /^(\d+)\s+([A-Z0-9]{2,3})\s*(\d+[A-Z]?)\s+(\d{1,2}[A-Z]{3})(?:\s+([A-Z0-9]))?\s+([A-Z]{3})\s*([A-Z]{3})\s*(?:[\*/\s]*([A-Z]{2}\d*))?\s+(\d{3,4}[AP]|\d{1,2}:\d{2})\s+(\d{3,4}[AP]|\d{1,2}:\d{2})(?:\s+(\d{1,2}[A-Z]{3}))?/i
    );
  }

  if (!match) return null;

  const segmentNumber = match[1];
  const airline = match[2];
  const flightNumber = match[3];
  const departureDate = match[4];
  const bookingClassChar = match[5];
  const departureAirport = match[6];
  const arrivalAirport = match[7];
  const status = match[8] || 'HK1';
  const departureTime = match[9];
  const arrivalTime = match[10];
  const arrivalDate = match[11];

  const cleanFlightNum = flightNumber.replace(/[A-Z]$/i, '');
  const derivedBookingClass = flightNumber.match(/[A-Z]$/i)
    ? flightNumber.slice(-1).toUpperCase()
    : bookingClassChar?.toUpperCase() || 'Y';

  const depParsedTime = parseTime(departureTime);
  const arrParsedTime = parseTime(arrivalTime);

  return {
    segmentNumber: Number(segmentNumber),
    marketingCarrier: {
      code: airline.toUpperCase(),
    },
    flightNumber: cleanFlightNum,
    bookingClass: derivedBookingClass,
    departure: {
      airport: departureAirport.toUpperCase(),
      date: departureDate.toUpperCase(),
      time: departureTime.toUpperCase(),
    },
    arrival: {
      airport: arrivalAirport.toUpperCase(),
      date: (arrivalDate || departureDate).toUpperCase(),
      time: arrivalTime.toUpperCase(),
    },
    status: parseStatus(status),
    codeshare: false,
    remarks: [],
  };
}

function parseOperatingCarrier(line: string, previousSegment: FlightSegment | null) {
  if (!previousSegment) return;

  const match = line.match(/OPERATED BY\s+(.+)/i);
  if (!match) return;

  const name = match[1].replace(/\s+/g, ' ').trim();
  previousSegment.operatingCarrier = {
    code: '',
    name,
  };
  previousSegment.codeshare = true;
}

function parseCodeshare(line: string, previousSegment: FlightSegment | null) {
  if (!previousSegment) return;

  /*
    Example:
    *DL CODE SHARE-QUOTE OPERATED BY KLMCITYHOPPE AS KL FLT 1939
  */
  let match = line.match(/OPERATED BY\s+.+?\s+AS\s+([A-Z0-9]{2,3})\s+(?:FLT|FLIGHT)?\s*(\d+)/i);

  if (match) {
    previousSegment.operatingCarrier = {
      code: match[1].toUpperCase(),
      name: previousSegment.operatingCarrier?.name || '',
    };
    previousSegment.operatingFlightNumber = match[2];
    previousSegment.codeshare = true;
    return;
  }

  /*
    Example:
    *DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 1561
  */
  match = line.match(/AS\s+([A-Z0-9]{2,3})\s+(?:FLT|FLIGHT)?\s*(\d+)/i);

  if (match) {
    previousSegment.operatingCarrier = {
      code: match[1].toUpperCase(),
      name: previousSegment.operatingCarrier?.name || '',
    };
    previousSegment.operatingFlightNumber = match[2];
    previousSegment.codeshare = true;
  }
}

function parseRemarks(lines: string[], segment: FlightSegment) {
  const remarks: string[] = [];

  for (const line of lines) {
    if (line.startsWith('OPERATED BY') || line.startsWith('*DL CODE') || line.startsWith('*')) {
      continue;
    }

    if (
      line.includes('ONLINE CONNECTING TRAFFIC') ||
      line.includes('SKY PRIORITY') ||
      line.includes('DELTA ONE') ||
      line.includes('MOVIES') ||
      line.includes('SVC') ||
      line.includes('TRAFFIC')
    ) {
      remarks.push(line);
    }
  }

  segment.remarks.push(...remarks);
}

export class AmadeusParser {
  public parse(rawText: string): NormalizedPNR {
    const lines = normalizeText(rawText || '');

    const result: NormalizedPNR = {
      metadata: {
        source: 'amadeus',
        rawText,
      },
      passengers: [],
      segments: [],
      warnings: [],
    };

    let currentSegment: FlightSegment | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for PNR locator
      if (!result.metadata.pnr) {
        const rlocMatch = line.match(/(?:RLOC|REC LOC|PNR|RECORD LOCATOR|BOOKING REF)[\s:-]+([A-Z0-9]{5,8})/i);
        if (rlocMatch) {
          result.metadata.pnr = rlocMatch[1].toUpperCase();
        }
      }

      // --------------------------
      // Passenger
      // --------------------------
      if (/^\d+\.\d+/.test(line) || (!line.includes('*') && line.includes('/'))) {
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
        parseOperatingCarrier(line, currentSegment);
        continue;
      }

      // --------------------------
      // Codeshare
      // --------------------------
      if (line.startsWith('*') && /CODE\s*SHARE/i.test(line)) {
        parseCodeshare(line, currentSegment);
        continue;
      }

      // --------------------------
      // Other remarks
      // --------------------------
      if (currentSegment) {
        parseRemarks([line], currentSegment);
      }
    }

    // Validation
    if (result.passengers.length === 0) {
      result.warnings.push('No passenger information detected');
    }

    if (result.segments.length === 0) {
      result.warnings.push('No flight segments detected');
    }

    return result;
  }
}
