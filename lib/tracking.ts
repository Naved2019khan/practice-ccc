import crypto from 'crypto';
import { NextRequest } from 'next/server';

export interface DeviceInfo {
  device: 'Mobile' | 'Tablet' | 'Desktop' | 'Bot' | 'Unknown';
  browser: string;
  os: string;
  summary: string;
}

/**
 * Parses user agent into Device type, Browser name, and OS
 */
export function parseUserAgent(userAgent = ''): DeviceInfo {
  const ua = userAgent.toLowerCase();

  // 1. Detect device type
  let device: DeviceInfo['device'] = 'Desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = 'Tablet';
  } else if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    device = 'Mobile';
  } else if (/bot|crawler|spider|crawling/i.test(ua)) {
    device = 'Bot';
  }

  // 2. Detect OS
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os (\d+)_?(\d+)?/i);
    os = match ? `iOS ${match[1]}.${match[2] || 0}` : 'iOS';
  } else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  // 3. Detect Browser
  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';

  return {
    device,
    browser,
    os,
    summary: `${device} (${browser} on ${os})`,
  };
}

/**
 * Generates a collision-resistant URL-safe token for public tracking links
 */
export function generateTrackingToken(): string {
  return `trk_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Extracts real client IP address from NextRequest
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp === '::1' || firstIp === '::ffff:127.0.0.1') return '127.0.0.1 (Localhost)';
    return firstIp;
  }
  const realIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-client-ip') ||
    req.headers.get('fastly-client-ip');
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed === '::1' || trimmed === '::ffff:127.0.0.1') return '127.0.0.1 (Localhost)';
    return trimmed;
  }
  return '127.0.0.1 (Localhost)';
}

export interface IpLocationDetails {
  city: string;
  region: string;
  country: string;
  fullLocation: string;
}

/**
 * Resolves an IP address to structured location data (city, region, country, fullLocation).
 * Uses ip-api.com (free, reliable server-side geo resolution).
 */
export async function resolveIpDetails(ip: string): Promise<IpLocationDetails> {
  if (!ip) {
    return {
      city: 'Unknown City',
      region: 'Unknown Region',
      country: 'Unknown Country',
      fullLocation: 'Location unavailable',
    };
  }
  const cleanIp = ip.replace(/^::ffff:/, '').replace(/\s*\(Localhost\)$/i, '').trim();

  // Check for private / loopback IP ranges
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('127.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('172.16.') ||
    cleanIp.toLowerCase().includes('localhost')
  ) {
    return {
      city: 'Localhost',
      region: 'Internal Network',
      country: 'Localhost',
      fullLocation: 'Localhost / Internal Network',
    };
  }

  try {
    const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,city,regionName,country`, {
      signal: AbortSignal.timeout(3500),
    });
    if (geoRes.ok) {
      const geo = await geoRes.json();
      if (geo.status === 'success') {
        const city = geo.city || '';
        const region = geo.regionName || '';
        const country = geo.country || '';
        const parts = [city, region, country].filter(Boolean);
        return {
          city: city || 'Unknown City',
          region: region || '',
          country: country || '',
          fullLocation: parts.length > 0 ? parts.join(', ') : 'Unknown Location',
        };
      }
    }
  } catch (err) {
    // Geo lookup is non-blocking fallback
  }

  return {
    city: 'Unknown City',
    region: 'Unknown Region',
    country: 'Unknown Country',
    fullLocation: 'Location unavailable',
  };
}

/**
 * Resolves an IP address to a human-readable location (City, Region, Country).
 * Uses ip-api.com (free, reliable server-side geo resolution).
 */
export async function resolveIpLocation(ip: string): Promise<string> {
  const details = await resolveIpDetails(ip);
  return details.fullLocation;
}

export interface CustomerEmailParams {
  lead: any;
  trackingToken: string;
  customMessage?: string;
  subject?: string;
  baseUrl?: string;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  attachedFiles?: Array<{
    id?: string;
    fileName: string;
    url: string;
    originalName?: string;
    formattedSize?: string;
  }>;
}

/**
 * Builds high-end responsive HTML email with embedded customer tracking URL, flight details, price & tickets
 */
export function buildCustomerEmailHtml({
  lead,
  trackingToken,
  customMessage,
  baseUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) ? process.env.NEXT_PUBLIC_APP_URL : 'http://crm.airlinesconsolidator.com',
  agentName = 'Flight Concierge Team',
  agentEmail = 'concierge@airlinesconsolidator.com',
  agentPhone = '+1 (888) 883-0727',
  attachedFiles = [],
}: CustomerEmailParams): { html: string; trackingUrl: string } {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const trackingUrl = `${cleanBase}/portal/${trackingToken}`;
  const pixelUrl = `${cleanBase}/api/track/pixel/${trackingToken}?token=${trackingToken}`;

  const travelDateFormatted = lead.travelDate
    ? new Date(lead.travelDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date Flexible';

  const returnDateFormatted = lead.returnDate
    ? new Date(lead.returnDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const displayedAmount =
    lead.totalAmount && lead.totalAmount > 0
      ? lead.totalAmount
      : (Number(lead.airlineCharge || 0) + Number(lead.airlineConsolidatorCharge || 0));

  const priceFormatted =
    displayedAmount && displayedAmount > 0
      ? `${lead.currency || 'USD'} ${Number(displayedAmount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}`
      : 'Quotation in Progress';

  const attachments = attachedFiles.length > 0 ? attachedFiles : lead.attachments || [];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight Itinerary & Ticket Confirmation</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F5F5F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 620px; margin: 24px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E7E5E4; box-shadow: 0 4px 16px rgba(28,25,23,0.06); }
    .header { background: #1C1917; padding: 28px 32px; border-bottom: 3px solid #C2410C; text-align: left; }
    .header-logo { color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin: 0; }
    .header-sub { color: #F59E0B; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .content { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1C1917; margin-top: 0; margin-bottom: 12px; }
    .intro-text { font-size: 14px; line-height: 1.6; color: #57534E; margin-bottom: 24px; }
    .itinerary-card { background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .flight-route { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed #D6D3D1; padding-bottom: 16px; margin-bottom: 16px; }
    .airport-code { font-size: 24px; font-weight: 800; color: #C2410C; margin: 0; }
    .flight-divider { font-size: 16px; color: #F59E0B; font-weight: bold; }
    .detail-grid { display: table; width: 100%; }
    .detail-row { display: table-row; }
    .detail-cell { display: table-cell; padding: 6px 0; font-size: 13px; color: #57534E; }
    .detail-cell.label { font-weight: 600; color: #78716C; width: 40%; }
    .detail-cell.value { font-weight: 700; color: #1C1917; }
    .price-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 18px; margin: 20px 0; }
    .price-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #92400E; margin: 0 0 4px 0; letter-spacing: 0.5px; }
    .price-amount { font-size: 22px; font-weight: 800; color: #B45309; margin: 0; }
    .attachments-section { background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .attachment-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FFFFFF; border: 1px solid #D6D3D1; border-radius: 6px; margin-top: 8px; }
    .attachment-name { font-size: 12px; font-weight: 700; color: #1C1917; text-decoration: none; }
    .cta-container { text-align: center; margin: 32px 0 24px 0; }
    .cta-btn { display: inline-block; background-color: #C2410C; color: #FFFFFF !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(194,65,12,0.25); }
    .footer { background: #FAFAF9; padding: 24px 32px; border-top: 1px solid #E7E5E4; text-align: center; color: #78716C; font-size: 12px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1 class="header-logo">AIRLINESCONSOLIDATOR</h1>
      <div class="header-sub">Official Flight &amp; VIP Travel Management</div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <h2 class="greeting">Hello ${lead.name || 'Valued Passenger'},</h2>
      <p class="intro-text">
        ${
          customMessage
            ? customMessage.replace(/\n/g, '<br/>')
            : `Your flight booking request and itinerary details have been updated by your concierge agent. Please review your complete flight itinerary, booking reference, and attached electronic travel documents below.`
        }
      </p>

      <!-- Flight Route & Specification Card -->
      <div class="itinerary-card">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <tr>
            <td style="font-size: 22px; font-weight: 800; color: #C2410C;">${lead.origin || 'ORIGIN'}</td>
            <td style="text-align: center; font-size: 18px; color: #F59E0B; font-weight: bold;">✈ ${lead.tripType || 'Flight'}</td>
            <td style="text-align: right; font-size: 22px; font-weight: 800; color: #C2410C;">${lead.destination || 'DESTINATION'}</td>
          </tr>
        </table>

        <div style="border-top: 1px solid #E7E5E4; padding-top: 12px;">
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #78716C; font-weight: 600; width: 40%;">Departure Date:</td>
              <td style="padding: 4px 0; color: #1C1917; font-weight: 700;">${travelDateFormatted}</td>
            </tr>
            ${
              returnDateFormatted
                ? `<tr>
              <td style="padding: 4px 0; color: #78716C; font-weight: 600;">Return Date:</td>
              <td style="padding: 4px 0; color: #1C1917; font-weight: 700;">${returnDateFormatted}</td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding: 4px 0; color: #78716C; font-weight: 600;">Passengers:</td>
              <td style="padding: 4px 0; color: #1C1917; font-weight: 700;">${lead.pax || 1} Passenger(s)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #78716C; font-weight: 600;">Booking Reference (PNR):</td>
              <td style="padding: 4px 0; color: #1C1917; font-weight: 800; font-family: monospace;">${lead.pnr || 'PENDING ISSUE'}</td>
            </tr>
            ${
              lead.ticketNumber
                ? `<tr>
              <td style="padding: 4px 0; color: #78716C; font-weight: 600;">Ticket Number:</td>
              <td style="padding: 4px 0; color: #1C1917; font-weight: 800; font-family: monospace;">${lead.ticketNumber}</td>
            </tr>`
                : ''
            }
            ${
              lead.invoiceNumber
                ? `<tr>
              <td style="padding: 4px 0; color: #78716C; font-weight: 600;">Invoice Number:</td>
              <td style="padding: 4px 0; color: #1C1917; font-weight: 700; font-family: monospace;">${lead.invoiceNumber}</td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding: 4px 0; color: #78716C; font-weight: 600;">Booking Status:</td>
              <td style="padding: 4px 0; color: #16A34A; font-weight: 700;">${lead.bookingType || 'Flight'} &bull; ${lead.stage || 'Active'} &bull; ${lead.paymentStatus || 'Pending'}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Price Box -->
      <div class="price-box">
        <div class="price-title">Total Fare Summary (${lead.currency || 'USD'})</div>
        <div class="price-amount">${priceFormatted}</div>
      </div>

      <!-- Attached Tickets List (with direct tracked download links) -->
      ${
        attachments.length > 0
          ? `
      <div class="attachments-section">
        <div style="font-size: 12px; font-weight: 700; color: #1C1917; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          📎 Attached E-Tickets & Boarding Documents (${attachments.length})
        </div>
        ${attachments
          .map((file: any) => {
            const ticketDownloadUrl = file.id
              ? `${cleanBase}/api/portal/${trackingToken}/download?attachmentId=${file.id}`
              : trackingUrl;
            return `
        <table style="width: 100%; background: #FFFFFF; border: 1px solid #D6D3D1; border-radius: 6px; padding: 10px 14px; margin-top: 8px;">
          <tr>
            <td style="font-size: 13px; font-weight: 700; color: #1C1917;">
              📄 ${file.originalName || file.fileName}
              <span style="font-size: 11px; color: #78716C; font-weight: normal; margin-left: 6px;">(${file.formattedSize || 'Attached'})</span>
            </td>
            <td style="text-align: right;">
              <a href="${ticketDownloadUrl}" style="display: inline-block; background: #C2410C; color: #FFFFFF !important; font-size: 11px; font-weight: 700; text-decoration: none; padding: 6px 12px; border-radius: 4px;">
                Download E-Ticket &darr;
              </a>
            </td>
          </tr>
        </table>
        `;
          })
          .join('')}
      </div>
      `
          : ''
      }

      <!-- Primary Customer Call To Action Button -->
      <div class="cta-container">
        <a href="${trackingUrl}" class="cta-btn" target="_blank">
          View My Itinerary & Tickets Online &rarr;
        </a>
        <div style="font-size: 11px; color: #78716C; margin-top: 10px;">
          Direct tracking link: <a href="${trackingUrl}" style="color: #C2410C;">${trackingUrl}</a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 6px 0;">
        Assigned Specialist: <strong>${agentName}</strong> (${agentEmail})
      </p>
      <p style="margin: 0; font-size: 11px; color: #A8A29E;">
        &copy; ${new Date().getFullYear()} AirlinesConsolidator. All rights reserved. &bull; 24/7 VIP Travel Support
      </p>
    </div>
  </div>

  <!-- 1x1 Invisible Tracking Pixel -->
  <img src="${pixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;outline:none;" alt="" />
</body>
</html>`;

  return { html, trackingUrl };
}
