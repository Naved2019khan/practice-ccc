/**
 * Template variable substitution engine.
 *
 * Replaces {{variable}} tokens in HTML/subject strings with real lead/agent data.
 * Guarantees that any standard booking placeholders resolve cleanly without leaving
 * raw curly braces in customer-facing emails.
 */

export interface TemplateVariables {
  // Passenger
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;

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
 * Dynamically builds HTML cards for flight legs.
 * Supports single leg (One Way) without showing 'N/A' tables, and multi-leg / round trips cleanly.
 */
export function buildItineraryHtml(lead: any): string {
  if (!lead) return '';
  const legs = Array.isArray(lead.flightLegs) && lead.flightLegs.length > 0 ? lead.flightLegs : [];

  const fmtDate = (d?: string | Date) => {
    if (!d) return 'Schedule Pending';
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // If no explicit legs in array, build from multi-city routes or origin/destination
  if (legs.length === 0) {
    if (lead.tripType === 'Multi-City' && Array.isArray(lead.multiCityRoutes) && lead.multiCityRoutes.length > 0) {
      const carrier = lead.airline || 'Airlines Consolidator';
      return lead.multiCityRoutes.map((r: any, idx: number) => {
        const depDate = fmtDate(r.travelDate);
        return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2ECFB; border-radius:10px; margin-bottom:14px; overflow:hidden;">
          <tr>
            <td colspan="2" style="background-color:#0B3C8A; padding:10px 16px;">
              <span style="color:#ffffff; font-size:13px; font-weight:700;">${carrier} · Sector ${idx + 1}</span>
              <span style="float:right; background-color:#FFC107; color:#0B3C8A; font-size:11px; font-weight:700; padding:2px 10px; border-radius:12px;">Economy</span>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding:16px; vertical-align:top; border-right:1px solid #EEF3FB;">
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Departing (Sector ${idx + 1})</div>
              <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${r.origin || 'Origin'}</div>
              <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">${depDate}</div>
            </td>
            <td width="50%" style="padding:16px; vertical-align:top;">
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Arriving</div>
              <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${r.destination || 'Destination'}</div>
              <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">Schedule Confirmed</div>
            </td>
          </tr>
        </table>
        `;
      }).join('');
    }

    const isRoundTrip = lead.tripType === 'Round Trip' || Boolean(lead.returnDate);
    const carrier = lead.airline || 'Airlines Consolidator';
    const fNum = lead.flightNumber || (lead.pnr ? `${carrier.slice(0, 2).toUpperCase()} ${lead.pnr.slice(2) || '101'}` : 'FL 101');
    const depDate = fmtDate(lead.travelDate);
    const arrDate = lead.travelDate ? fmtDate(lead.travelDate) : 'Schedule Pending';

    let html = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2ECFB; border-radius:10px; margin-bottom:14px; overflow:hidden;">
        <tr>
          <td colspan="2" style="background-color:#0B3C8A; padding:10px 16px;">
            <span style="color:#ffffff; font-size:13px; font-weight:700;">${carrier} ${fNum}</span>
            <span style="float:right; background-color:#FFC107; color:#0B3C8A; font-size:11px; font-weight:700; padding:2px 10px; border-radius:12px;">Economy</span>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:16px; vertical-align:top; border-right:1px solid #EEF3FB;">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Departing</div>
            <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${lead.origin || 'Origin'}</div>
            <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">${depDate}</div>
          </td>
          <td width="50%" style="padding:16px; vertical-align:top;">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Arriving</div>
            <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${lead.destination || 'Destination'}</div>
            <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">${arrDate}</div>
          </td>
        </tr>
      </table>
    `;

    if (isRoundTrip && lead.returnDate) {
      const retDepDate = fmtDate(lead.returnDate);
      html += `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2ECFB; border-radius:10px; margin-bottom:20px; overflow:hidden;">
        <tr>
          <td colspan="2" style="background-color:#0B3C8A; padding:10px 16px;">
            <span style="color:#ffffff; font-size:13px; font-weight:700;">${carrier} (Return Flight)</span>
            <span style="float:right; background-color:#FFC107; color:#0B3C8A; font-size:11px; font-weight:700; padding:2px 10px; border-radius:12px;">Economy</span>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:16px; vertical-align:top; border-right:1px solid #EEF3FB;">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Departing</div>
            <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${lead.destination || 'Destination'}</div>
            <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">${retDepDate}</div>
          </td>
          <td width="50%" style="padding:16px; vertical-align:top;">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Arriving</div>
            <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${lead.origin || 'Origin'}</div>
            <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">${retDepDate}</div>
          </td>
        </tr>
      </table>
      `;
    }

    return html;
  }

  // If explicit legs exist in lead:
  return legs.map((leg: any, idx: number) => {
    const carrier = leg.carrier || lead.airline || 'Airlines Consolidator';
    const fNum = leg.flightNumber ? (leg.carrier ? `${leg.carrier} ${leg.flightNumber}` : leg.flightNumber) : (idx === 0 ? 'FL 101' : `FL 10${idx + 1}`);
    const fClass = leg.flightClass || 'Economy';
    const depAirport = leg.departingAirport || lead.origin || 'Origin';
    const arrAirport = leg.arrivingAirport || lead.destination || 'Destination';
    const depTime = fmtDate(leg.departingAt || lead.travelDate);
    const arrTime = fmtDate(leg.arrivingAt || leg.departingAt || lead.travelDate);

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2ECFB; border-radius:10px; margin-bottom:14px; overflow:hidden;">
        <tr>
          <td colspan="2" style="background-color:#0B3C8A; padding:10px 16px;">
            <span style="color:#ffffff; font-size:13px; font-weight:700;">${fNum}</span>
            <span style="float:right; background-color:#FFC107; color:#0B3C8A; font-size:11px; font-weight:700; padding:2px 10px; border-radius:12px;">${fClass}</span>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:16px; vertical-align:top; border-right:1px solid #EEF3FB;">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Departing (Leg ${idx + 1})</div>
            <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${depAirport}</div>
            <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">${depTime}</div>
          </td>
          <td width="50%" style="padding:16px; vertical-align:top;">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#8a9bbf; margin-bottom:6px;">Arriving</div>
            <div style="font-size:14px; font-weight:700; color:#1a2b4c;">${arrAirport}</div>
            <div style="font-size:13px; color:#0B3C8A; font-weight:600; margin-top:4px;">${arrTime}</div>
          </td>
        </tr>
        ${(leg.baggage || leg.meal || leg.seat) ? `
        <tr>
          <td colspan="2" style="background-color:#F8FAFF; padding:8px 16px; border-top:1px solid #EEF3FB; font-size:11px; color:#5b7bab;">
            ${[
              leg.baggage && `<strong style="color:#1a2b4c;">Baggage:</strong> ${leg.baggage}`,
              leg.meal && `<strong style="color:#1a2b4c;">Meal:</strong> ${leg.meal}`,
              leg.seat && `<strong style="color:#1a2b4c;">Seat:</strong> ${leg.seat}`,
            ].filter(Boolean).join(' &nbsp;&bull;&nbsp; ')}
          </td>
        </tr>
        ` : ''}
      </table>
    `;
  }).join('');
}

/**
 * Dynamically builds HTML table rows for passengers.
 */
export function buildPassengersHtml(lead: any): string {
  if (!lead) return '';
  const paxList = Array.isArray(lead.passengers) && lead.passengers.length > 0 ? lead.passengers : [];
  if (paxList.length === 0) {
    return `
      <tr>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; font-weight:600; border:1px solid #E2ECFB;">${lead.name || 'Valued Passenger'}</td>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; border:1px solid #E2ECFB;">${lead.gender || '—'}</td>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; border:1px solid #E2ECFB;">${lead.phone || '—'}</td>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; border:1px solid #E2ECFB;">${lead.email || '—'}</td>
      </tr>
    `;
  }

  return paxList.map((pax: any) => {
    const fullName = [pax.firstName, pax.lastName].filter(Boolean).join(' ') || lead.name || 'Valued Passenger';
    const dobInfo = pax.dob ? `<div style="font-size:11px; color:#64748B; margin-top:2px;">DOB: ${pax.dob}</div>` : '';
    return `
      <tr>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; font-weight:600; border:1px solid #E2ECFB;">
          ${fullName}
          ${dobInfo}
        </td>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; border:1px solid #E2ECFB;">${pax.gender || '—'}</td>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; border:1px solid #E2ECFB;">${pax.phone || lead.phone || '—'}</td>
        <td style="padding:12px; font-size:14px; color:#1a2b4c; border:1px solid #E2ECFB;">${pax.email || lead.email || '—'}</td>
      </tr>
    `;
  }).join('');
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

  // Booking reference: prefer invoiceNumber, fall back to pnr, then short ID
  const leadIdShort = lead._id ? lead._id.toString().slice(-6).toUpperCase() : '';
  const bookingReference =
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
  const flight2Number = leg2?.flightNumber ? (leg2.carrier ? `${leg2.carrier} ${leg2.flightNumber}` : leg2.flightNumber) : (lead.flight2Number || 'FL 102');

  // Assigned Agent details
  const resolvedAgentName = agentName || lead.assignedTo?.name || 'Concierge Team';
  const resolvedAgentEmail = agentEmail || lead.assignedTo?.email || 'concierge@airlinesconsolidator.com';
  const resolvedAgentPhone = agentPhone || lead.assignedTo?.phone || '+1 (888) 883-0727';

  // Departure and arrival datetimes
  const dep1DateFormatted = leg1?.departingAt ? fmt(leg1.departingAt, true) : (lead.travelDate ? fmt(lead.travelDate, true) : 'Schedule Pending');
  const arr1DateFormatted = leg1?.arrivingAt ? fmt(leg1.arrivingAt, true) : (lead.flight1ArrDatetime || (lead.travelDate ? `${fmt(lead.travelDate)} (Estimated)` : 'Schedule Pending'));

  const dep2DateFormatted = isRoundTrip
    ? (leg2?.departingAt ? fmt(leg2.departingAt, true) : (lead.returnDate ? fmt(lead.returnDate, true) : (lead.travelDate ? `${fmt(lead.travelDate)} (Return TBA)` : 'Return Schedule TBA')))
    : '';
  const arr2DateFormatted = isRoundTrip
    ? (leg2?.arrivingAt ? fmt(leg2.arrivingAt, true) : (lead.flight2ArrDatetime || (lead.returnDate ? `${fmt(lead.returnDate)} (Estimated)` : 'Arrival Schedule TBA')))
    : '';

  // Passenger primary details
  const paxList = Array.isArray(lead.passengers) && lead.passengers.length > 0 ? lead.passengers : [];
  const primaryPax = paxList[0];
  const primaryName = primaryPax ? [primaryPax.firstName, primaryPax.lastName].filter(Boolean).join(' ') : (lead.name || 'Valued Passenger');
  const primaryGender = primaryPax?.gender || lead.gender || 'On file';
  const primaryPhone = primaryPax?.phone || lead.phone || 'On file';
  const primaryEmail = primaryPax?.email || lead.email || 'On file';

  const itineraryHtml = buildItineraryHtml(lead);
  const passengersHtml = buildPassengersHtml(lead);

  return {
    // Passenger
    name: primaryName,
    email: primaryEmail,
    phone: primaryPhone,
    gender: primaryGender,

    // Dynamic HTML Blocks
    itinerary_legs_html: itineraryHtml,
    passengers_rows_html: passengersHtml,

    // Booking meta
    booking_reference: bookingReference,
    date_booked: fmt(lead.createdAt || new Date()),
    pnr: lead.pnr || (leadIdShort ? `PNR-${leadIdShort}` : 'PENDING'),
    invoice_number: lead.invoiceNumber || bookingReference,
    ticket_number: lead.ticketNumber || (lead.pnr ? `ETKT-${lead.pnr}` : 'Pending Issuance'),

    // Itinerary
    origin: leg1?.departingAirport || lead.origin || 'Origin',
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
