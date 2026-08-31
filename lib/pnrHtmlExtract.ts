/**
 * Pulls structured route data out of the itinerary HTML pasted from an external
 * PNR converter (pnrconverter.com / pnrdecoder.com).
 *
 * The converters render a table whose "from" / "at" columns carry the airport
 * name with its IATA code in parentheses, e.g.
 *   "New York John F Kennedy Airport, (JFK)" … "Amsterdam Schiphol Airport (AMS)"
 *
 * We only need enough to populate the lead's `origin` / `destination` so the
 * leads table can show a route. The first airport encountered is the origin and
 * the last is the destination, which holds for one-way, return and multi-leg
 * itineraries alike.
 *
 * Runs in both Node and the browser (pure string work, no DOM).
 */

export interface ExtractedRoute {
  /** IATA code of the first departure airport, e.g. "JFK". */
  origin: string;
  /** IATA code of the final arrival airport, e.g. "AMS". */
  destination: string;
  /** Every airport code found, in itinerary order. */
  airports: string[];
}

/** Convert HTML to plain text so the airport codes can be scanned in order. */
function htmlToText(html: string): string {
  return String(html)
    // Drop anything non-visual first so their contents don't pollute the text.
    .replace(/<(script|style|head|title)\b[\s\S]*?<\/\1>/gi, ' ')
    // Turn tags into separators so adjacent cells don't get glued together.
    .replace(/<[^>]+>/g, ' ')
    // Decode the handful of entities that show up in these tables.
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Words that appear in parentheses in these itineraries but are not airports.
 * Guards against matching things like "(on the 20 Jul)" or cabin codes.
 */
const NOT_AIRPORT = new Set([
  'ECO',
  'BUS',
  'FST',
  'PRE',
  'AM',
  'PM',
  'GMT',
  'UTC',
  'EST',
  'PST',
  'CST',
  'MST',
]);

/**
 * Extract the airport codes, in order, from itinerary HTML or plain text.
 *
 * Matches 3-letter uppercase codes wrapped in parentheses, which is how both
 * converters render them. Consecutive duplicates are collapsed so a layover
 * listed as both an arrival and the next departure counts once.
 */
export function extractAirportCodes(htmlOrText: string): string[] {
  if (!htmlOrText) return [];
  const text = htmlToText(htmlOrText);

  const codes: string[] = [];
  const re = /\(\s*([A-Z]{3})\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const code = m[1].toUpperCase();
    if (NOT_AIRPORT.has(code)) continue;
    // Collapse an immediate repeat (arrival airport === next departure).
    if (codes[codes.length - 1] === code) continue;
    codes.push(code);
  }
  return codes;
}

/**
 * Derive origin/destination from itinerary HTML. Returns empty strings when the
 * HTML carries no recognisable airport codes, so callers can fall back to
 * whatever they already have.
 *
 * For a round trip the final airport is the origin again (JFK → AMS → JFK),
 * which reads poorly as a route. In that case we report the turnaround point as
 * the destination so the leads table shows "JFK → AMS" rather than "JFK → JFK".
 */
export function extractRouteFromHtml(htmlOrText: string): ExtractedRoute {
  const airports = extractAirportCodes(htmlOrText);
  const origin = airports[0] || '';

  let destination = '';
  if (airports.length > 1) {
    const last = airports[airports.length - 1];
    destination =
      last === origin
        ? // Round trip — use the turnaround airport.
          airports[Math.floor((airports.length - 1) / 2)] || last
        : last;
  }

  return { origin, destination, airports };
}
