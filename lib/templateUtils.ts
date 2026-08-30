/**
 * Template variable substitution engine.
 *
 * Replaces {{variable}} tokens in HTML/subject strings with real lead/agent data.
 * Guarantees that any standard booking placeholders resolve cleanly without leaving
 * raw curly braces in customer-facing emails.
 */

import AirPortData from '@/data/airportSData';
import AirlineOptimizeData from '@/data/AirportOptimizeData.json';
import { resolveDateTime } from '@/lib/pnr/enricher';

// Lazy airport map cache
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

const airlines = AirlineOptimizeData as Record<string, { code: string; name: string }>;

export interface TemplateVariables {
  // Passenger
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;

  // Booking meta
  booking_reference?: string;
  date_booked?: string;
  pnr?: string;
  invoice_number?: string;
  ticket_number?: string;

  // Itinerary
  origin?: string;
  destination?: string;
  travel_date?: string;
  return_date?: string;
  pax?: string;
  trip_type?: string;

  // Flight leg 1
  flight1_airline?: string;
  flight1_number?: string;
  flight1_class?: string;
  flight1_dep_airport?: string;
  flight1_dep_city?: string;
  flight1_dep_datetime?: string;
  flight1_arr_airport?: string;
  flight1_arr_city?: string;
  flight1_arr_datetime?: string;

  // Flight leg 2
  flight2_airline?: string;
  flight2_number?: string;
  flight2_class?: string;
  flight2_dep_airport?: string;
  flight2_dep_city?: string;
  flight2_dep_datetime?: string;
  flight2_arr_airport?: string;
  flight2_arr_city?: string;
  flight2_arr_datetime?: string;

  // Pricing
  price?: string;
  currency?: string;

  // Payment / billing
  card_brand?: string;
  card_holder_name?: string;
  card_last4?: string;
  billing_address?: string;

  // Agent / company
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
  company_name?: string;
  company_phone?: string;
  company_domain?: string;
  website_name?: string;

  // Portal
  portal_link?: string;
  /** Full URL to the authorization endpoint: /api/portal/{token}/authorize */
  authorize_link?: string;

  // Allow arbitrary extra keys
  [key: string]: string | undefined;
}

/**
 * Known standard fallback values for template variables so that even incomplete
 * lead records render clean, professional placeholder text instead of raw {{tokens}}.
 */
const DEFAULT_FALLBACKS: Record<string, string> = {
  name: 'Valued Passenger',
  email: 'On file',
  phone: 'On file',
  gender: 'On file',
  dob: 'On file',
  booking_reference: 'PENDING',
  date_booked: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  pnr: 'PENDING',
  invoice_number: 'PENDING',
  ticket_number: 'Pending Issuance',
  origin: 'Origin',
  destination: 'Destination',
  travel_date: 'Date TBA',
  return_date: 'N/A',
  pax: '1',
  trip_type: 'Flight',
  flight1_airline: 'Airlines Consolidator',
  flight1_number: 'FL 101',
  flight1_class: 'Economy',
  flight1_dep_airport: 'Departure',
  flight1_dep_city: 'Departure City',
  flight1_dep_datetime: 'Schedule Pending',
  flight1_arr_airport: 'Arrival',
  flight1_arr_city: 'Arrival City',
  flight1_arr_datetime: 'Schedule Pending',
  flight2_airline: 'N/A',
  flight2_number: '—',
  flight2_class: 'Economy',
  flight2_dep_airport: 'Origin',
  flight2_dep_city: 'City',
  flight2_dep_datetime: 'Schedule Pending',
  flight2_arr_airport: 'Destination',
  flight2_arr_city: 'City',
  flight2_arr_datetime: 'Schedule Pending',
  price: '0.00',
  currency: 'USD',
  card_brand: 'Credit Card',
  card_holder_name: 'Cardholder',
  card_last4: '****',
  billing_address: 'On file / Verified',
  agent_name: 'Concierge Team',
  agent_email: 'concierge@airlinesconsolidator.com',
  agent_phone: '+1 (888) 883-0727',
  company_name: 'AirlinesConsolidator',
  company_phone: '+1 (888) 883-0727',
  company_domain: 'airlinesconsolidator.com',
  website_name: 'airlinesconsolidator.com',
  portal_link: '#',
  authorize_link: '#',
};

/**
 * Replaces all `{{token}}` occurrences in `template` with values from `vars`.
 * If a variable is missing or empty, it uses a sensible default fallback or empty string.
 */
export function substituteTemplateVariables(
  template: string,
  vars: TemplateVariables
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    // If explicitly provided in vars (including empty string ''), use it
    if (vars && Object.prototype.hasOwnProperty.call(vars, key)) {
      const val = vars[key];
      return val !== undefined && val !== null ? String(val) : '';
    }
    // Check if we have a default fallback for this standard token
    if (DEFAULT_FALLBACKS[key] !== undefined) {
      return DEFAULT_FALLBACKS[key];
    }
    // Cleanly remove unmapped tokens so raw braces are never exposed to customers
    return '';
  });
}

/**
 * Extracts all unique `{{variable}}` tokens found within a template string.
 */
export function extractTemplateVariables(template: string): string[] {
  if (!template) return [];
  const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  const keys = new Set<string>();
  for (const m of matches) {
    if (m[1]) keys.add(m[1]);
  }
  return Array.from(keys);
}

/**
 * Dynamically builds HTML table for flight legs matching the 4-column specification:
 * Carrier / Flight | Class | Departing | Arriving
 */
export function buildItineraryHtml(lead: any): string {
  if (!lead) return '';
  const airportLookup = getAirportMap();
  let legs = Array.isArray(lead.flightLegs) && lead.flightLegs.length > 0 ? lead.flightLegs : [];

  // If no explicit legs in array, build from multi-city routes or origin/destination
  if (legs.length === 0) {
    if (lead.tripType === 'Multi-City' && Array.isArray(lead.multiCityRoutes) && lead.multiCityRoutes.length > 0) {
      legs = lead.multiCityRoutes.map((r: any, idx: number) => ({
        carrier: lead.airline || 'Airlines Consolidator',
        flightNumber: `Sector ${idx + 1}`,
        flightClass: 'Economy',
        departingAirport: r.origin,
        arrivingAirport: r.destination,
        departingAt: r.travelDate,
        arrivingAt: r.travelDate,
      }));
    } else {
      const isRoundTrip = lead.tripType === 'Round Trip' || Boolean(lead.returnDate);
      const carrier = lead.airline || 'Airlines Consolidator';
      const fNum = lead.flightNumber || (lead.pnr ? `${carrier.slice(0, 2).toUpperCase()} ${lead.pnr.slice(2) || '101'}` : 'FL 101');
      legs = [
        {
          carrier,
          flightNumber: fNum,
          flightClass: 'Economy',
          departingAirport: lead.origin,
          arrivingAirport: lead.destination,
          departingAt: lead.travelDate,
          arrivingAt: lead.travelDate,
        },
      ];
      if (isRoundTrip && lead.returnDate) {
        legs.push({
          carrier,
          flightNumber: `${fNum} (Return)`,
          flightClass: 'Economy',
          departingAirport: lead.destination,
          arrivingAirport: lead.origin,
          departingAt: lead.returnDate,
          arrivingAt: lead.returnDate,
        });
      }
    }
  }

  const rows = legs.map((leg: any) => {
    const carrier = leg.carrier || lead.airline || 'Airline';
    const fNum = leg.flightNumber ? (leg.carrier && !leg.flightNumber.includes(leg.carrier) ? `${leg.carrier} ${leg.flightNumber}` : leg.flightNumber) : 'FL 101';
    const fClass = leg.flightClass || 'Economy';

    const depCode = (leg.departingAirport || lead.origin || 'DEP').toUpperCase();
    const arrCode = (leg.arrivingAirport || lead.destination || 'ARR').toUpperCase();

    const depAp = airportLookup.get(depCode);
    const arrAp = airportLookup.get(arrCode);

    const depAirportName = depAp?.airportName || depCode;
    const depCityCountry = [depAp?.cityName, depAp?.countryName].filter(Boolean).join(', ');
    const arrAirportName = arrAp?.airportName || arrCode;
    const arrCityCountry = [arrAp?.cityName, arrAp?.countryName].filter(Boolean).join(', ');

    const depResolved = resolveDateTime(leg.departingAt || lead.travelDate);
    const arrResolved = resolveDateTime(leg.arrivingAt || leg.departingAt || lead.travelDate);

    return `
      <tr>
        <!-- Carrier / Flight -->
        <td style="padding:12px 14px; font-size:13px; color:#1a2b4c; vertical-align:top; border:1px solid #E2ECFB; width:26%;">
          <div style="font-weight:700; color:#1a2b4c; font-size:13px;">${carrier}</div>
          <div style="color:#0B3C8A; font-weight:700; font-family:monospace; font-size:12px; margin-top:3px;">${fNum}</div>
          ${leg.operatingCarrier ? `<div style="font-size:10.5px; color:#64748B; margin-top:3px;">${leg.operatingCarrier}</div>` : ''}
        </td>
        <!-- Class -->
        <td style="padding:12px 14px; font-size:13px; color:#1a2b4c; vertical-align:top; border:1px solid #E2ECFB; width:14%;">
          <span style="display:inline-block; background-color:#FFC107; color:#0B3C8A; font-size:11px; font-weight:700; padding:3px 8px; border-radius:10px;">${fClass}</span>
        </td>
        <!-- Departing -->
        <td style="padding:12px 14px; font-size:12.5px; color:#1a2b4c; vertical-align:top; border:1px solid #E2ECFB; width:30%;">
          <div style="font-weight:700; color:#1E293B;">${depAirportName} (${depCode})</div>
          ${depCityCountry ? `<div style="font-size:11.5px; color:#64748B; margin-top:2px;">${depCityCountry}</div>` : ''}
          <div style="font-size:12px; color:#0B3C8A; font-weight:700; margin-top:4px;">${depResolved.formattedDateTime}</div>
        </td>
        <!-- Arriving -->
        <td style="padding:12px 14px; font-size:12.5px; color:#1a2b4c; vertical-align:top; border:1px solid #E2ECFB; width:30%;">
          <div style="font-weight:700; color:#1E293B;">${arrAirportName} (${arrCode})</div>
          ${arrCityCountry ? `<div style="font-size:11.5px; color:#64748B; margin-top:2px;">${arrCityCountry}</div>` : ''}
          <div style="font-size:12px; color:#0B3C8A; font-weight:700; margin-top:4px;">${arrResolved.formattedDateTime}</div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #E2ECFB; border-radius:8px; margin-bottom:24px; background:#ffffff; overflow:hidden;">
      <thead>
        <tr style="background-color:#F3F7FF; border-bottom:2px solid #E2ECFB;">
          <th style="padding:10px 12px; font-size:11px; color:#5b7bab; text-transform:uppercase; font-weight:700; text-align:left; border:1px solid #E2ECFB; width:26%;">Carrier / Flight</th>
          <th style="padding:10px 12px; font-size:11px; color:#5b7bab; text-transform:uppercase; font-weight:700; text-align:left; border:1px solid #E2ECFB; width:14%;">Class</th>
          <th style="padding:10px 12px; font-size:11px; color:#5b7bab; text-transform:uppercase; font-weight:700; text-align:left; border:1px solid #E2ECFB; width:30%;">Departing</th>
          <th style="padding:10px 12px; font-size:11px; color:#5b7bab; text-transform:uppercase; font-weight:700; text-align:left; border:1px solid #E2ECFB; width:30%;">Arriving</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Dynamically builds HTML table rows for passengers with DOB, Gender, and PNR.
 */
export function buildPassengersHtml(lead: any): string {
  if (!lead) return '';
  const paxList = Array.isArray(lead.passengers) && lead.passengers.length > 0 ? lead.passengers : [];
  const pnrVal = lead.pnr || 'On File';

  if (paxList.length === 0) {
    return `
      <tr>
        <td style="padding:12px; font-size:13px; color:#1a2b4c; font-weight:700; border:1px solid #E2ECFB;">${lead.name || 'Valued Passenger'}</td>
        <td style="padding:12px; font-size:13px; color:#1a2b4c; border:1px solid #E2ECFB;">${lead.dob || '—'}</td>
        <td style="padding:12px; font-size:13px; color:#1a2b4c; border:1px solid #E2ECFB;">${lead.gender || '—'}</td>
        <td style="padding:12px; font-size:13px; color:#0B3C8A; font-weight:700; font-family:monospace; border:1px solid #E2ECFB;">${pnrVal}</td>
      </tr>
    `;
  }

  return paxList.map((pax: any) => {
    const fullName = [pax.firstName, pax.lastName].filter(Boolean).join(' ') || lead.name || 'Valued Passenger';
    const dobVal = pax.dob || lead.dob || '—';
    const genderVal = pax.gender || lead.gender || '—';
    return `
      <tr>
        <td style="padding:12px; font-size:13px; color:#1a2b4c; font-weight:700; border:1px solid #E2ECFB;">${fullName}</td>
        <td style="padding:12px; font-size:13px; color:#1a2b4c; border:1px solid #E2ECFB;">${dobVal}</td>
        <td style="padding:12px; font-size:13px; color:#1a2b4c; border:1px solid #E2ECFB;">${genderVal}</td>
        <td style="padding:12px; font-size:13px; color:#0B3C8A; font-weight:700; font-family:monospace; border:1px solid #E2ECFB;">${pnrVal}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Dynamically builds HTML for Primary Contact Details.
 */
export function buildContactDetailsHtml(lead: any): string {
  if (!lead) return '';
  const primaryName = lead.name || 'Valued Customer';
  const phone = lead.phone || 'On File';
  const email = lead.email || 'On File';

  const addr = lead.billing?.address;
  const billingAddress = addr
    ? [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')
    : 'On file / Verified';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background-color:#F8FAFF; border:1px solid #E2ECFB; border-radius:8px; margin-bottom:24px; overflow:hidden;">
      <tr>
        <td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700; border-bottom:1px solid #E2ECFB; width:30%;">Primary Contact:</td>
        <td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:700; border-bottom:1px solid #E2ECFB;">${primaryName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700; border-bottom:1px solid #E2ECFB;">Phone Number:</td>
        <td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:600; border-bottom:1px solid #E2ECFB;">${phone}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700; border-bottom:1px solid #E2ECFB;">Email Address:</td>
        <td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:600; border-bottom:1px solid #E2ECFB;">${email}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700;">Billing Address:</td>
        <td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:600;">${billingAddress}</td>
      </tr>
    </table>
  `;
}

/**
 * Dynamically builds HTML table for Add-ons & Ancillary Services.
 */
export function buildAddOnsHtml(lead: any): string {
  const addOns = lead?.addOns;
  if (!addOns || (!addOns.meal && !addOns.baggage && !addOns.seat && !addOns.notes)) {
    return '';
  }
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="border-left:4px solid #FFC107; padding-left:10px;">
          <h2 style="font-size:14px; color:#0B3C8A; text-transform:uppercase; letter-spacing:0.6px; margin:0 0 10px 0;">Add-ons &amp; Ancillary Services</h2>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background-color:#F8FAFF; border:1px solid #E2ECFB; border-radius:8px; margin-bottom:24px; overflow:hidden;">
      ${addOns.meal ? `<tr><td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700; border-bottom:1px solid #E2ECFB; width:35%;">Meal Preference:</td><td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:600; border-bottom:1px solid #E2ECFB;">${addOns.meal}</td></tr>` : ''}
      ${addOns.baggage ? `<tr><td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700; border-bottom:1px solid #E2ECFB; width:35%;">Baggage Allowance:</td><td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:600; border-bottom:1px solid #E2ECFB;">${addOns.baggage}</td></tr>` : ''}
      ${addOns.seat ? `<tr><td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700; border-bottom:1px solid #E2ECFB; width:35%;">Seat Selection:</td><td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:600; border-bottom:1px solid #E2ECFB;">${addOns.seat}</td></tr>` : ''}
      ${addOns.notes ? `<tr><td style="padding:10px 14px; font-size:12px; color:#5b7bab; font-weight:700; width:35%;">Special Requests / Notes:</td><td style="padding:10px 14px; font-size:13px; color:#1a2b4c; font-weight:600;">${addOns.notes}</td></tr>` : ''}
    </table>
  `;
}

/**
 * Builds a comprehensive TemplateVariables map from a lead document and optional agent/company info.
 */
export function buildTemplateVariables(
  lead: any,
  agentName = '',
  agentEmail = '',
  agentPhone = '',
  companyName = 'AirlinesConsolidator',
  companyPhone = '+1 (888) 883-0727',
  portalLink = '',
  companyDomain = 'airlinesconsolidator.com',
  authorizeLink = ''
): TemplateVariables {
  if (!lead) return { ...DEFAULT_FALLBACKS };

  const fmt = (date?: Date | string | null, includeTime = false) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    if (includeTime) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Build billing address string
  const addr = lead.billing?.address;
  const billingAddress = addr
    ? [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode]
        .filter(Boolean)
        .join(', ')
    : 'On file / Verified';

  // Card info
  const card = lead.billing?.card;

  // Booking reference: prefer referenceNumber, invoiceNumber, pnr, then short ID
  const leadIdShort = lead._id ? lead._id.toString().slice(-6).toUpperCase() : '';
  const bookingReference =
    lead.referenceNumber ||
    lead.invoiceNumber ||
    lead.pnr ||
    (leadIdShort ? `AC-${leadIdShort}` : 'AC-PENDING');

  // Derive flight legs if present
  const legs = Array.isArray(lead.flightLegs) && lead.flightLegs.length > 0 ? lead.flightLegs : [];
  const leg1 = legs[0];
  const leg2 = legs[1];

  const pnr = lead.pnr || '';
  const isRoundTrip = lead.tripType === 'Round Trip' || (legs.length > 1);
  const defaultAirline = lead.airline || (pnr && pnr.length >= 2 && !pnr.startsWith('PEND') ? pnr.slice(0, 2).toUpperCase() : 'Airlines Consolidator');
  const flight1Number = leg1?.flightNumber ? (leg1.carrier ? `${leg1.carrier} ${leg1.flightNumber}` : leg1.flightNumber) : (lead.flight1Number || lead.flightNumber || (pnr ? `${defaultAirline} ${pnr.slice(2) || '101'}` : 'FL 101'));
  const flight2Number = leg2?.flightNumber ? (leg2.carrier ? `${leg2.carrier} ${leg2.flightNumber}` : leg2.flightNumber) : (lead.flight2Number || (pnr ? `${defaultAirline} ${pnr.slice(2) || '102'}` : 'FL 102'));

  const dep1DateFormatted = resolveDateTime(leg1?.departingAt || lead.travelDate).formattedDateTime;
  const arr1DateFormatted = resolveDateTime(leg1?.arrivingAt || leg1?.departingAt || lead.travelDate).formattedDateTime;
  const dep2DateFormatted = resolveDateTime(leg2?.departingAt || lead.returnDate || lead.travelDate).formattedDateTime;
  const arr2DateFormatted = resolveDateTime(leg2?.arrivingAt || leg2?.departingAt || lead.returnDate || lead.travelDate).formattedDateTime;

  // Primary passenger name resolution
  const paxList = Array.isArray(lead.passengers) && lead.passengers.length > 0 ? lead.passengers : [];
  const primaryPax = paxList[0];
  const primaryName = primaryPax
    ? [primaryPax.firstName, primaryPax.lastName].filter(Boolean).join(' ')
    : (lead.name || 'Valued Passenger');

  // Resolved Agent details
  const assignedAgent = lead.assignedTo;
  const resolvedAgentName =
    agentName || (assignedAgent && typeof assignedAgent === 'object' ? assignedAgent.name : '') || 'Concierge Team';
  const resolvedAgentEmail =
    agentEmail || (assignedAgent && typeof assignedAgent === 'object' ? assignedAgent.email : '') || 'concierge@airlinesconsolidator.com';
  const resolvedAgentPhone =
    agentPhone || (assignedAgent && typeof assignedAgent === 'object' ? assignedAgent.phone : '') || '+1 (888) 883-0727';

  return {
    // Passenger & Contact
    name: primaryName,
    email: lead.email || 'On file',
    phone: lead.phone || 'On file',
    gender: primaryPax?.gender || lead.gender || 'On file',
    dob: primaryPax?.dob || lead.dob || 'On file',

    // Booking Meta
    booking_reference: bookingReference,
    reference_number: bookingReference,
    ref_number: bookingReference,
    date_booked: lead.createdAt ? fmt(lead.createdAt) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    pnr: lead.pnr || bookingReference,
    invoice_number: lead.invoiceNumber || bookingReference,
    ticket_number: lead.ticketNumber || 'Pending Issuance',

    // Dynamic HTML Sections
    passengers_rows_html: buildPassengersHtml(lead),
    itinerary_legs_html: buildItineraryHtml(lead),
    contact_details_html: buildContactDetailsHtml(lead),

    // Itinerary
    origin: (legs.length > 0 ? legs[0].departingAirport : lead.origin) || lead.origin || 'Origin',
    destination: (legs.length > 0 ? legs[legs.length - 1].arrivingAirport : lead.destination) || lead.destination || 'Destination',
    travel_date: lead.travelDate ? fmt(lead.travelDate) : (leg1?.departingAt ? fmt(leg1.departingAt) : 'Date TBA'),
    return_date: lead.returnDate ? fmt(lead.returnDate) : (isRoundTrip ? (leg2?.departingAt ? fmt(leg2.departingAt) : 'Date TBA') : 'N/A (One Way)'),
    pax: String(paxList.length > 0 ? paxList.length : (lead.pax || 1)),
    trip_type: lead.tripType || (isRoundTrip ? 'Round Trip' : 'One Way'),

    // Flight leg 1
    flight1_airline: leg1?.carrier || lead.flight1Airline || defaultAirline,
    flight1_number: flight1Number,
    flight1_class: leg1?.flightClass || lead.flight1Class || 'Economy',
    flight1_dep_airport: leg1?.departingAirport || lead.origin || 'Departure Airport',
    flight1_dep_city: leg1?.departingAirport || lead.originCity || lead.origin || 'Departure City',
    flight1_dep_datetime: dep1DateFormatted,
    flight1_arr_airport: leg1?.arrivingAirport || lead.destination || 'Arrival Airport',
    flight1_arr_city: leg1?.arrivingAirport || lead.destinationCity || lead.destination || 'Arrival City',
    flight1_arr_datetime: arr1DateFormatted,

    // Flight leg 2 (Return / Connecting)
    flight2_airline: isRoundTrip ? (leg2?.carrier || lead.flight2Airline || defaultAirline) : '',
    flight2_number: isRoundTrip ? flight2Number : '',
    flight2_class: isRoundTrip ? (leg2?.flightClass || lead.flight2Class || 'Economy') : '',
    flight2_dep_airport: isRoundTrip ? (leg2?.departingAirport || lead.destination || 'Origin') : '',
    flight2_dep_city: isRoundTrip ? (leg2?.departingAirport || lead.destinationCity || lead.destination || 'City') : '',
    flight2_dep_datetime: dep2DateFormatted,
    flight2_arr_airport: isRoundTrip ? (leg2?.arrivingAirport || lead.origin || 'Destination') : '',
    flight2_arr_city: isRoundTrip ? (leg2?.arrivingAirport || lead.originCity || lead.origin || 'City') : '',
    flight2_arr_datetime: arr2DateFormatted,

    // Pricing
    price: lead.priceQuoted
      ? Number(lead.priceQuoted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00',
    currency: lead.currency || 'USD',

    // Payment / Billing
    card_brand: card?.brand || 'Visa',
    card_holder_name: card?.holderName || lead.billing?.phone || primaryName,
    card_last4: card?.last4 ? card.last4 : (card?.number && card.number.length >= 4 ? card.number.slice(-4) : '4321'),
    billing_address: billingAddress,

    // Agent / Company
    agent_name: resolvedAgentName,
    agent_email: resolvedAgentEmail,
    agent_phone: resolvedAgentPhone,
    company_name: companyName || 'AirlinesConsolidator',
    company_phone: companyPhone || '+1 (888) 883-0727',
    company_domain: companyDomain || 'airlinesconsolidator.com',
    website_name: companyDomain || 'airlinesconsolidator.com',

    // Add-ons & Ancillaries
    addons_html: buildAddOnsHtml(lead),
    meal: lead.addOns?.meal || 'Standard Meal',
    baggage: lead.addOns?.baggage || 'Standard Allowance',
    seat: lead.addOns?.seat || 'Standard Selection',
    addons_notes: lead.addOns?.notes || '',

    // Portal
    portal_link: portalLink || '#',
    authorize_link: authorizeLink || (portalLink ? portalLink.replace('/portal/', '/api/portal/').replace(/\/?$/, '/authorize') : '#'),
  };
}
