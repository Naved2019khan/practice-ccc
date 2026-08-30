import AirPortData from '@/data/airportSData';
import AirlineOptimizeData from '@/data/AirportOptimizeData.json';
import { FlightSegment, NormalizedPNR } from './types';

// Map of airport code -> airport details
let airportMap: Map<string, { airportName: string; cityName: string; countryName: string }> | null = null;

function getAirportMap() {
  if (!airportMap) {
    airportMap = new Map();
    if (Array.isArray(AirPortData)) {
      for (const item of AirPortData) {
        if (item && item.airportCode) {
          airportMap.set(item.airportCode.toUpperCase(), {
            airportName: item.airportName || item.airportCode,
            cityName: item.cityName || '',
            countryName: item.countryName || '',
          });
        }
      }
    }
  }
  return airportMap;
}

// Map of airline code -> airline name
const airlines = AirlineOptimizeData as Record<string, { code: string; name: string }>;

// Well-known airline fallback names for common codes
const fallbackAirlines: Record<string, string> = {
  DL: 'Delta Air Lines',
  AA: 'American Airlines',
  UA: 'United Airlines',
  BA: 'British Airways',
  AF: 'Air France',
  KL: 'KLM Royal Dutch Airlines',
  LH: 'Lufthansa',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  SQ: 'Singapore Airlines',
  AI: 'Air India',
  '6E': 'IndiGo',
  UK: 'Vistara',
  AC: 'Air Canada',
  QF: 'Qantas',
  CX: 'Cathay Pacific',
  TK: 'Turkish Airlines',
  EY: 'Etihad Airways',
  VS: 'Virgin Atlantic',
  WN: 'Southwest Airlines',
  B6: 'JetBlue Airways',
  AS: 'Alaska Airlines',
};

// Cabin Class mapping based on booking class codes
const CABIN_MAPPING: Record<string, string> = {
  // First Class
  F: 'First',
  A: 'First',
  P: 'First',
  R: 'First',

  // Business Class
  J: 'Business',
  C: 'Business',
  D: 'Business',
  I: 'Business',
  Z: 'Business',

  // Premium Economy
  W: 'Premium Economy',
  E: 'Premium Economy',

  // Economy (default for standard classes)
  Y: 'Economy',
  B: 'Economy',
  M: 'Economy',
  H: 'Economy',
  Q: 'Economy',
  V: 'Economy',
  S: 'Economy',
  T: 'Economy',
  L: 'Economy',
  K: 'Economy',
  G: 'Economy',
  N: 'Economy',
  O: 'Economy',
  X: 'Economy',
  U: 'Economy',
};

const MONTH_NAMES: Record<string, number> = {
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

/**
 * Parses a PNR time string like "436P", "0555A", "1120A", "1800", "0800", "710P" into { hours24, minutes, formattedTime }
 */
export function parsePNRTime(timeStr: string): { hours24: number; minutes: number; formattedTime: string } {
  if (!timeStr) return { hours24: 0, minutes: 0, formattedTime: '—' };
  const raw = timeStr.trim().toUpperCase();

  // Pattern with A/P/N/M e.g. 436P (4:36 PM), 1120A (11:20 AM), 555A (5:55 AM)
  const ampmMatch = raw.match(/^(\d{1,2})(\d{2})([APMN])?$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const modifier = ampmMatch[3];

    if (modifier === 'P' && hours < 12) {
      hours += 12;
    } else if (modifier === 'A' && hours === 12) {
      hours = 0;
    } else if (modifier === 'M') {
      // Midnight
      hours = 0;
    } else if (modifier === 'N') {
      // Noon
      hours = 12;
    }

    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedMinutes = String(minutes).padStart(2, '0');

    return {
      hours24: hours,
      minutes,
      formattedTime: `${displayHour}:${formattedMinutes} ${period}`,
    };
  }

  // Fallback pattern with colon e.g. 14:30
  const colonMatch = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);
  if (colonMatch) {
    let hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    const modifier = colonMatch[3];
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedMinutes = String(minutes).padStart(2, '0');

    return {
      hours24: hours,
      minutes,
      formattedTime: `${displayHour}:${formattedMinutes} ${period}`,
    };
  }

  return { hours24: 0, minutes: 0, formattedTime: raw };
}

/**
 * Converts a PNR date (e.g. "19JUL", "2024-07-19", or Date) and time (e.g. "436P", "16:36") into ISO string & readable date
 */
export function resolveDateTime(dateStr?: string | Date, timeStr: string = ''): {
  iso: string;
  formattedDate: string;
  formattedDateTime: string;
  year: number;
  month: number;
  day: number;
} {
  const currentYear = new Date().getFullYear();
  let day = 1;
  let month = 0;
  let year = currentYear;
  let hasParsedIsoTime = false;
  let isoHours = 0;
  let isoMinutes = 0;

  if (dateStr) {
    if (dateStr instanceof Date) {
      if (!isNaN(dateStr.getTime())) {
        year = dateStr.getFullYear();
        month = dateStr.getMonth();
        day = dateStr.getDate();
        isoHours = dateStr.getHours();
        isoMinutes = dateStr.getMinutes();
        hasParsedIsoTime = true;
      }
    } else {
      const rawStr = String(dateStr).trim();
      // Format 1: PNR style "19JUL" or "19JUL24" or "19JUL 2024"
      const pnrDateMatch = rawStr.toUpperCase().match(/^(\d{1,2})([A-Z]{3})(?:\s*(\d{2,4}))?$/);
      if (pnrDateMatch) {
        day = parseInt(pnrDateMatch[1], 10);
        const monthKey = pnrDateMatch[2];
        month = MONTH_NAMES[monthKey] ?? 0;
        if (pnrDateMatch[3]) {
          const parsedYear = parseInt(pnrDateMatch[3], 10);
          year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
        }
      } else {
        // Format 2: ISO style "2024-07-19" or "2024-07-19T16:36:00.000Z"
        const isoMatch = rawStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
        if (isoMatch) {
          year = parseInt(isoMatch[1], 10);
          month = parseInt(isoMatch[2], 10) - 1;
          day = parseInt(isoMatch[3], 10);
          if (isoMatch[4] && isoMatch[5]) {
            isoHours = parseInt(isoMatch[4], 10);
            isoMinutes = parseInt(isoMatch[5], 10);
            hasParsedIsoTime = true;
          }
        } else {
          const d = new Date(rawStr);
          if (!isNaN(d.getTime())) {
            year = d.getUTCFullYear();
            month = d.getUTCMonth();
            day = d.getUTCDate();
          }
        }
      }
    }
  }

  const { hours24, minutes, formattedTime } = timeStr
    ? parsePNRTime(timeStr)
    : hasParsedIsoTime
    ? {
        hours24: isoHours,
        minutes: isoMinutes,
        formattedTime: `${isoHours % 12 === 0 ? 12 : isoHours % 12}:${String(isoMinutes).padStart(2, '0')} ${isoHours >= 12 ? 'PM' : 'AM'}`,
      }
    : parsePNRTime('');

  const dt = new Date(Date.UTC(year, month, day, hours24, minutes, 0));
  const monthNameShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ][month] || 'Jan';

  const formattedDate = `${day} ${monthNameShort}`;
  const formattedDateTime = `${day} ${monthNameShort}, ${year} @ ${formattedTime}`;

  return {
    iso: dt.toISOString(),
    formattedDate,
    formattedDateTime,
    year,
    month,
    day,
  };
}

export function enrichSegment(segment: FlightSegment): FlightSegment {
  const airportLookup = getAirportMap();

  // 1. Marketing Carrier enrichment
  const carrierCode = segment.marketingCarrier.code.toUpperCase();
  const airlineInfo = airlines[carrierCode];
  const airlineName = airlineInfo?.name || fallbackAirlines[carrierCode] || carrierCode;
  segment.marketingCarrier.name = airlineName;

  // 2. Cabin class enrichment
  const bookingClass = (segment.bookingClass || '').toUpperCase();
  segment.cabin = CABIN_MAPPING[bookingClass] || 'Economy';

  // 3. Departure enrichment
  const depCode = segment.departure.airport.toUpperCase();
  const depAirport = airportLookup.get(depCode);
  segment.departure.airportName = depAirport?.airportName || depCode;
  segment.departure.city = depAirport?.cityName || '';
  segment.departure.country = depAirport?.countryName || '';

  const depDateTime = resolveDateTime(segment.departure.date, segment.departure.time);
  segment.departure.dateTimeISO = depDateTime.iso;

  // 4. Arrival enrichment
  const arrCode = segment.arrival.airport.toUpperCase();
  const arrAirport = airportLookup.get(arrCode);
  segment.arrival.airportName = arrAirport?.airportName || arrCode;
  segment.arrival.city = arrAirport?.cityName || '';
  segment.arrival.country = arrAirport?.countryName || '';

  const arrDateTime = resolveDateTime(segment.arrival.date, segment.arrival.time);
  segment.arrival.dateTimeISO = arrDateTime.iso;

  // 5. Operating Carrier enrichment
  if (segment.operatingCarrier?.code) {
    const opCode = segment.operatingCarrier.code.toUpperCase();
    const opAirlineInfo = airlines[opCode];
    if (!segment.operatingCarrier.name) {
      segment.operatingCarrier.name = opAirlineInfo?.name || fallbackAirlines[opCode] || opCode;
    }
  }

  // 6. Calculate approximate duration if possible
  const depMs = new Date(depDateTime.iso).getTime();
  const arrMs = new Date(arrDateTime.iso).getTime();
  if (arrMs > depMs) {
    segment.durationMinutes = Math.round((arrMs - depMs) / (1000 * 60));
  }

  return segment;
}

export function enrichPNR(normalized: NormalizedPNR): NormalizedPNR {
  const enrichedSegments = normalized.segments.map((seg) => enrichSegment(seg));

  return {
    ...normalized,
    segments: enrichedSegments,
  };
}
