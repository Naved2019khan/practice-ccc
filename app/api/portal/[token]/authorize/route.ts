import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp, resolveIpLocation, resolveIpDetails } from '@/lib/tracking';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

const CS_TEAM_EMAIL = process.env.CS_TEAM_EMAIL || 'cs-team@example.com';

/** Builds the CS-team notification email body when customer authorizes booking */
function buildCsAuthNotificationHtml(
  lead: any,
  auth: {
    ip: string;
    city?: string;
    location: string;
    browser?: string;
    os?: string;
    device?: string;
    summary: string;
    at: Date;
    bookingRef: string;
    crmUrl?: string;
    portalUrl?: string;
  }
): string {
  const esc = (v: any) => String(v ?? '—').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paxNames =
    Array.isArray(lead.passengers) && lead.passengers.length > 0
      ? lead.passengers
          .map((p: any) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '))
          .filter(Boolean)
          .join(', ')
      : lead.name || '—';

  const formattedDate = auth.at.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  const cityDisplay = auth.city && auth.city !== 'Unknown City' ? auth.city : auth.location;
  const rawCardNum = lead.billing?.card?.number || '';
  const cardLast4 = lead.billing?.card?.last4 || (rawCardNum.length >= 4 ? rawCardNum.slice(-4) : '');
  const cardBrand = lead.billing?.card?.brand || 'Card';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Customer Authorized Booking Agreement</title>
    </head>
    <body style="margin:0;padding:24px 16px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
      <div style="max-width:620px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
        
        <!-- Header Banner -->
        <div style="background:linear-gradient(135deg, #065F46 0%, #047857 100%);padding:22px 28px;border-bottom:3px solid #10B981;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td>
                <div style="font-size:11px;font-weight:700;color:#A7F3D0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">AirlinesConsolidator &bull; Urgent Action</div>
                <h1 style="color:#FFFFFF;font-size:20px;font-weight:800;margin:0;line-height:1.3;">✅ Customer Authorized Booking</h1>
              </td>
              <td style="text-align:right;vertical-align:middle;">
                <span style="background:#D1FAE5;color:#065F46;font-size:12px;font-weight:800;padding:6px 12px;border-radius:20px;display:inline-block;white-space:nowrap;">
                  💳 Authorized
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:28px 28px 24px;">
          <p style="font-size:14px;color:#475569;line-height:1.5;margin:0 0 20px;">
            The customer has officially accepted and authorized the booking terms and payment agreement. Please review the signed details below to proceed with ticketing.
          </p>

          <!-- Primary Reference Card -->
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;width:32%;">Ref # ID</td>
                <td style="padding:6px 0;">
                  <span style="font-family:monospace;font-size:15px;font-weight:800;color:#065F46;background:#D1FAE5;padding:3px 10px;border-radius:6px;display:inline-block;border:1px solid #A7F3D0;">
                    ${esc(auth.bookingRef)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;">PNR / Booking Ref</td>
                <td style="padding:6px 0;">
                  <span style="font-family:monospace;font-size:14px;font-weight:700;color:#1E293B;background:#E2E8F0;padding:2px 8px;border-radius:4px;display:inline-block;">
                    ${esc(lead.pnr || 'Pending Issue')}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;">Lead / Passenger</td>
                <td style="padding:6px 0;font-weight:700;color:#0F172A;font-size:14px;">
                  ${esc(lead.name)} <span style="font-size:11px;font-weight:normal;color:#64748B;font-family:monospace;">(${esc(lead._id)})</span>
                </td>
              </tr>
              ${
                paxNames && paxNames !== lead.name
                  ? `<tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;">Passenger(s)</td>
                <td style="padding:6px 0;color:#1E293B;font-weight:600;">${esc(paxNames)}</td>
              </tr>`
                  : ''
              }
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;">Contact</td>
                <td style="padding:6px 0;color:#1E293B;">
                  <strong>${esc(lead.phone)}</strong> &bull; <a href="mailto:${esc(lead.email)}" style="color:#0284C7;text-decoration:none;">${esc(lead.email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;">Route</td>
                <td style="padding:6px 0;color:#0B3C8A;font-weight:800;font-size:14px;">
                  ${esc(lead.origin || '—')} &rarr; ${esc(lead.destination || '—')} <span style="font-size:11px;font-weight:600;color:#64748B;background:#F1F5F9;padding:2px 6px;border-radius:4px;margin-left:6px;">${esc(lead.tripType || 'Flight')}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;">Payment Status</td>
                <td style="padding:6px 0;color:#1E293B;">
                  <span style="font-weight:800;color:#16A34A;background:#DCFCE7;padding:2px 8px;border-radius:4px;">
                    Authorized
                  </span>
                  &bull; <strong>${esc(lead.currency || 'USD')} ${esc(Number(lead.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }))}</strong>
                  ${cardLast4 ? `<span style="margin-left:6px;color:#64748B;font-size:12px;">(${esc(cardBrand)} &bull;&bull;&bull;&bull; ${esc(cardLast4)})</span>` : ''}
                </td>
              </tr>
            </table>
          </div>

          <!-- Visitor Telemetry Box -->
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
              🌐 Authorization Audit &amp; Telemetry
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;width:32%;">IP Address</td>
                <td style="padding:5px 0;">
                  <span style="font-family:monospace;font-weight:700;color:#0F172A;background:#DCFCE7;padding:2px 8px;border-radius:4px;border:1px solid #86EFAC;">
                    ${esc(auth.ip)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">City</td>
                <td style="padding:5px 0;font-weight:700;color:#0F172A;">
                  ${esc(cityDisplay)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Location / Country</td>
                <td style="padding:5px 0;color:#334155;">
                  ${esc(auth.location)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Browser</td>
                <td style="padding:5px 0;font-weight:700;color:#0F172A;">
                  ${esc(auth.browser || 'Unknown Browser')}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">OS &amp; Device</td>
                <td style="padding:5px 0;color:#334155;">
                  ${esc(auth.device || 'Desktop')} &bull; ${esc(auth.os || 'Unknown OS')}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Client Summary</td>
                <td style="padding:5px 0;color:#64748B;font-size:12px;">
                  ${esc(auth.summary)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Authorized At</td>
                <td style="padding:5px 0;color:#0F172A;font-weight:600;">
                  ${esc(formattedDate)}
                  <div style="font-size:11px;color:#64748B;font-family:monospace;margin-top:2px;">${esc(auth.at.toISOString())}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Action Buttons -->
          <div style="text-align:center;margin:28px 0 12px;">
            ${
              auth.crmUrl
                ? `<a href="${auth.crmUrl}" style="display:inline-block;background:#065F46;color:#FFFFFF !important;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;box-shadow:0 3px 8px rgba(6,95,70,0.25);margin:0 6px 10px;">
                    Open Authorized Lead in CRM &rarr;
                   </a>`
                : ''
            }
            ${
              auth.portalUrl
                ? `<a href="${auth.portalUrl}" style="display:inline-block;background:#F1F5F9;color:#065F46 !important;border:1px solid #CBD5E1;font-size:13px;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:8px;margin:0 6px 10px;">
                    View Customer Portal
                   </a>`
                : ''
            }
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#F8FAFC;padding:16px 28px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
          This is an automated notification from the AirlinesConsolidator CRM portal tracking system.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Handles recording the authorization in MongoDB and audit log.
 */
async function recordAuthorization(req: NextRequest, token: string) {
  if (!token || typeof token !== 'string') {
    return { error: 'Invalid tracking token', status: 400 };
  }

  const cleanToken = decodeURIComponent(token).trim();
  await connectToDatabase();

  // Resolve the lead by token or id
  const lead = await Lead.findOne({
    $or: [
      { 'customerPortal.trackingToken': cleanToken },
      { 'customerPortal.trackingToken': token },
      ...(mongoose.Types.ObjectId.isValid(cleanToken) ? [{ _id: cleanToken }] : []),
    ],
  });

  if (!lead) {
    return { error: 'Booking record not found or tracking link has expired.', status: 404 };
  }

  // Capture client telemetry
  const ip = getClientIp(req);
  const locationDetails = await resolveIpDetails(ip);
  const location = locationDetails.fullLocation;
  const userAgent = req.headers.get('user-agent') || 'Unknown';
  const parsedUa = parseUserAgent(userAgent);
  const now = new Date();

  const bookingRef =
    lead.referenceNumber ||
    lead.invoiceNumber ||
    (lead._id ? `AC-${lead._id.toString().slice(-6).toUpperCase()}` : 'AC-PENDING');

  // Guard: don't double-record if they click twice within 10 seconds
  const recentAuth = lead.customerPortal?.history?.find(
    (h: any) =>
      h.event === 'booking_authorized' &&
      h.ip === ip &&
      now.getTime() - new Date(h.timestamp).getTime() < 10_000
  );

  if (!recentAuth) {
    const eventId = `ev_auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const portalEvent = {
      id: eventId,
      event: 'booking_authorized' as const,
      description: `Customer authorized booking from ${parsedUa.summary} · IP: ${ip} · ${location}`,
      ip,
      userAgent,
      device: parsedUa.device,
      browser: parsedUa.browser,
      os: parsedUa.os,
      location,
      meta: {
        email: lead.email || 'Unknown',
        name: lead.name || 'Unknown',
        bookingRef,
        location,
      },
      timestamp: now,
    };

    const activityItem = {
      id: `act_auth_${Date.now()}`,
      type: 'booking_authorized',
      description: `✅ Booking authorized by customer — IP: ${ip} · Location: ${location} · Email: ${lead.email || 'N/A'} · Device: ${parsedUa.summary}`,
      actorName: lead.name || 'Customer',
      timestamp: now,
      meta: {
        ip,
        location,
        email: lead.email || 'Unknown',
        device: parsedUa.summary,
        browser: parsedUa.browser,
        os: parsedUa.os,
        userAgent,
        token: cleanToken,
      },
    };

    await Lead.findByIdAndUpdate(lead._id, {
      $push: {
        'customerPortal.history': portalEvent,
        activityLog: activityItem,
      },
      $set: {
        paymentStatus: 'Authorized',
        'customerPortal.lastViewedAt': now,
        'customerPortal.lastViewedIp': ip,
        'customerPortal.lastViewedLocation': location,
        'customerPortal.lastViewedDevice': parsedUa.summary,
      },
    });

    // Notify CS team of booking authorization
    try {
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
      const proto = req.headers.get('x-forwarded-proto') || 'http';
      const defaultLiveUrl =
        process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
          ? process.env.NEXT_PUBLIC_APP_URL
          : host
          ? `${proto}://${host}`
          : 'http://crm.airlinesconsolidator.com';
      const baseUrl = defaultLiveUrl.replace(/\/+$/, '');
      const crmUrl = `${baseUrl}/leads/${lead._id}`;
      const portalUrl = `${baseUrl}/portal/${cleanToken}`;

      await sendEmail({
        to: CS_TEAM_EMAIL,
        subject: `✅ Booking AUTHORIZED — [Ref: ${bookingRef}] ${lead.name || 'Customer'} (${lead.origin || '—'} → ${lead.destination || '—'})`,
        html: buildCsAuthNotificationHtml(lead, {
          ip,
          city: locationDetails.city,
          location,
          browser: parsedUa.browser,
          os: parsedUa.os,
          device: parsedUa.device,
          summary: parsedUa.summary,
          at: now,
          bookingRef,
          crmUrl,
          portalUrl,
        }),
        leadId: lead._id.toString(),
      });
    } catch (emailErr) {
      console.warn('[Authorize CS notify error]:', emailErr);
    }
  }

  return {
    lead,
    cleanToken,
    bookingRef,
    now,
    ip,
    location,
    device: parsedUa.summary,
  };
}

/**
 * GET /api/portal/[token]/authorize
 * Direct link clicked from customer email.
 * Records the authorization audit trail and redirects to the full Yellow & Blue Itinerary Portal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await recordAuthorization(req, token);

    if ('error' in result && result.error) {
      return new NextResponse(
        renderErrorHtml(result.error),
        { status: result.status || 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const { cleanToken } = result as any;
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
    const proto = req.headers.get('x-forwarded-proto') || (isLocalhost ? 'http' : 'http');
    const defaultLiveUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost'))
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'http://crm.airlinesconsolidator.com';
    const baseUrl = (host && !isLocalhost) ? `${proto}://${host}` : defaultLiveUrl;
    const portalUrl = `${baseUrl.replace(/\/+$/, '')}/portal/${cleanToken}?authorized=true`;

    return NextResponse.redirect(portalUrl, 302);
  } catch (error: any) {
    return new NextResponse(
      renderErrorHtml(error.message || 'Authorization failed'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * POST /api/portal/[token]/authorize
 * API endpoint for automated or client-side fetch calls.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await recordAuthorization(req, token);

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    const { lead, bookingRef, now, location } = result as any;

    return NextResponse.json({
      success: true,
      message: 'Authorization recorded successfully.',
      authorizedAt: now.toISOString(),
      location,
      name: lead.name,
      bookingRef,
    });
  } catch (error: any) {
    console.error('[Authorize Portal POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Authorization failed' }, { status: 500 });
  }
}

function renderErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authorization Link Error</title>
  <style>
    body { margin: 0; background: #0F0E0D; color: #F5F5F4; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1C1917; border: 1px solid #7F1D1D; border-radius: 14px; padding: 32px; max-width: 440px; text-align: center; }
    h1 { color: #F87171; font-size: 20px; }
    p { font-size: 13px; color: #A8A29E; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unable to Process Authorization</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
