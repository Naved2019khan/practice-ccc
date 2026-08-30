import { CRMLeadMapping, FormattedItinerary, FormattedSegment, NormalizedPNR } from './types';
import { parsePNRTime, resolveDateTime } from './enricher';

function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDateToYYYYMMDD(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function formatItinerary(normalized: NormalizedPNR): FormattedItinerary {
  const segments = normalized.segments || [];
  const passengers = normalized.passengers || [];

  const formattedPassengers = passengers.map((p) => {
    const fn = capitalizeWords(p.firstName);
    const ln = capitalizeWords(p.lastName);
    const fullName = `${fn} ${ln}`.trim();
    return {
      fullName,
      firstName: fn,
      lastName: ln,
      title: p.title,
    };
  });

  const formattedSegments: FormattedSegment[] = segments.map((seg) => {
    const carrierName = seg.marketingCarrier.name || seg.marketingCarrier.code;
    const carrierAndFlight = `${carrierName} ${seg.marketingCarrier.code}${seg.flightNumber}`.trim();

    const depResolved = resolveDateTime(seg.departure.date, seg.departure.time);
    const arrResolved = resolveDateTime(seg.arrival.date, seg.arrival.time);

    const depAirportTitle = seg.departure.airportName || seg.departure.airport;
    const depCityCountry = [seg.departure.city, seg.departure.country].filter(Boolean).join(', ');
    const depDisplay = `${depAirportTitle} (${seg.departure.airport})\n${depCityCountry ? depCityCountry + '\n' : ''}${depResolved.formattedDateTime}`;

    const arrAirportTitle = seg.arrival.airportName || seg.arrival.airport;
    const arrCityCountry = [seg.arrival.city, seg.arrival.country].filter(Boolean).join(', ');
    const arrDisplay = `${arrAirportTitle} (${seg.arrival.airport})\n${arrCityCountry ? arrCityCountry + '\n' : ''}${arrResolved.formattedDateTime}`;

    let durationText: string | undefined;
    if (seg.durationMinutes && seg.durationMinutes > 0) {
      const hrs = Math.floor(seg.durationMinutes / 60);
      const mins = seg.durationMinutes % 60;
      durationText = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }

    let operatingCarrierText: string | undefined;
    if (seg.operatingCarrier?.name || seg.operatingCarrier?.code) {
      const opName = seg.operatingCarrier.name || seg.operatingCarrier.code;
      const opFlt = seg.operatingFlightNumber ? ` FLT ${seg.operatingFlightNumber}` : '';
      operatingCarrierText = `Operated by ${opName}${opFlt}`;
    }

    return {
      carrierAndFlight,
      marketingCarrierName: carrierName,
      marketingCarrierCode: seg.marketingCarrier.code,
      flightNumber: seg.flightNumber,
      cabinClass: seg.cabin || 'Economy',
      bookingClass: seg.bookingClass,
      departure: {
        airportCode: seg.departure.airport,
        airportName: seg.departure.airportName || seg.departure.airport,
        city: seg.departure.city || '',
        country: seg.departure.country || '',
        formattedDate: depResolved.formattedDate,
        formattedTime: parsePNRTime(seg.departure.time).formattedTime,
        displayString: depDisplay,
        isoDateTime: depResolved.iso,
      },
      arrival: {
        airportCode: seg.arrival.airport,
        airportName: seg.arrival.airportName || seg.arrival.airport,
        city: seg.arrival.city || '',
        country: seg.arrival.country || '',
        formattedDate: arrResolved.formattedDate,
        formattedTime: parsePNRTime(seg.arrival.time).formattedTime,
        displayString: arrDisplay,
        isoDateTime: arrResolved.iso,
      },
      durationText,
      operatingCarrierText,
      codeshare: !!seg.codeshare,
      remarks: seg.remarks,
    };
  });

  // Determine Summary Trip Type, Origin, Destination, Dates
  let tripType: 'One Way' | 'Round Trip' | 'Multi-City' = 'One Way';
  let origin = '';
  let destination = '';
  let travelDate = '';
  let returnDate: string | undefined;

  if (segments.length === 1) {
    tripType = 'One Way';
    origin = segments[0].departure.airport;
    destination = segments[0].arrival.airport;
    const depDt = resolveDateTime(segments[0].departure.date, segments[0].departure.time);
    travelDate = formatDateToYYYYMMDD(depDt.year, depDt.month, depDt.day);
  } else if (segments.length > 1) {
    const firstLeg = segments[0];
    const lastLeg = segments[segments.length - 1];

    origin = firstLeg.departure.airport;
    const firstDepDt = resolveDateTime(firstLeg.departure.date, firstLeg.departure.time);
    travelDate = formatDateToYYYYMMDD(firstDepDt.year, firstDepDt.month, firstDepDt.day);

    if (lastLeg.arrival.airport === firstLeg.departure.airport) {
      // Returned to origin
      if (segments.length === 2) {
        tripType = 'Round Trip';
        destination = firstLeg.arrival.airport;
        const lastDepDt = resolveDateTime(lastLeg.departure.date, lastLeg.departure.time);
        returnDate = formatDateToYYYYMMDD(lastDepDt.year, lastDepDt.month, lastDepDt.day);
      } else {
        // Multi-leg journey that returns home
        // Check if there is a clear turning point
        tripType = 'Round Trip';
        // Mid-point destination is the furthest or halfway arrival airport
        destination = segments[Math.floor(segments.length / 2) - 1]?.arrival.airport || segments[0].arrival.airport;
        const lastDepDt = resolveDateTime(lastLeg.departure.date, lastLeg.departure.time);
        returnDate = formatDateToYYYYMMDD(lastDepDt.year, lastDepDt.month, lastDepDt.day);
      }
    } else {
      // Multi-City or multi-segment one way
      if (segments.length === 2 && segments[0].arrival.airport === segments[1].departure.airport) {
        // Connecting flight: One Way with stopover
        tripType = 'One Way';
        destination = lastLeg.arrival.airport;
      } else {
        tripType = 'Multi-City';
        destination = lastLeg.arrival.airport;
      }
    }
  }

  const routeStr = segments.length > 0
    ? segments.map((s, idx) => (idx === 0 ? `${s.departure.airport} → ${s.arrival.airport}` : `→ ${s.arrival.airport}`)).join(' ')
    : '';

  return {
    passengers: formattedPassengers,
    segments: formattedSegments,
    pnr: normalized.metadata.pnr,
    source: normalized.metadata.source,
    summary: {
      route: routeStr,
      tripType,
      origin,
      destination,
      travelDate,
      returnDate,
      paxCount: Math.max(1, passengers.length),
    },
    warnings: normalized.warnings,
  };
}

export function mapPNRToCRMLead(normalized: NormalizedPNR): CRMLeadMapping {
  const formatted = formatItinerary(normalized);
  const segments = normalized.segments || [];
  const passengers = formatted.passengers || [];

  const primaryName = passengers[0]?.fullName || (passengers[0] ? `${passengers[0].firstName} ${passengers[0].lastName}` : '');

  const crmPassengers = passengers.map((p, idx) => ({
    id: `pax_${Date.now()}_${idx + 1}`,
    firstName: p.firstName,
    lastName: p.lastName,
    gender: '',
    dob: '',
  }));

  const crmFlightLegs = segments.map((seg, idx) => {
    const carrierName = seg.marketingCarrier.name || seg.marketingCarrier.code;
    const depResolved = resolveDateTime(seg.departure.date, seg.departure.time);
    const arrResolved = resolveDateTime(seg.arrival.date, seg.arrival.time);

    return {
      id: `leg_${Date.now()}_${idx + 1}`,
      carrier: carrierName,
      flightNumber: `${seg.marketingCarrier.code} ${seg.flightNumber}`.trim(),
      flightClass: seg.cabin || 'Economy',
      departingAirport: seg.departure.airport,
      departingAt: depResolved.iso,
      arrivingAirport: seg.arrival.airport,
      arrivingAt: arrResolved.iso,
    };
  });

  const multiCityRoutes = segments.map((seg, idx) => {
    const depResolved = resolveDateTime(seg.departure.date, seg.departure.time);
    return {
      id: `route_${Date.now()}_${idx + 1}`,
      origin: seg.departure.airport,
      destination: seg.arrival.airport,
      travelDate: formatDateToYYYYMMDD(depResolved.year, depResolved.month, depResolved.day),
    };
  });

  return {
    name: primaryName,
    pax: Math.max(1, passengers.length),
    passengers: crmPassengers,
    flightLegs: crmFlightLegs,
    origin: formatted.summary.origin,
    destination: formatted.summary.destination,
    travelDate: formatted.summary.travelDate,
    returnDate: formatted.summary.returnDate,
    tripType: formatted.summary.tripType,
    multiCityRoutes: formatted.summary.tripType === 'Multi-City' ? multiCityRoutes : undefined,
    pnr: normalized.metadata.pnr,
  };
}
