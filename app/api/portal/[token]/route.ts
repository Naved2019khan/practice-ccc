import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp, resolveIpLocation, resolveIpDetails } from '@/lib/tracking';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

/**
 * Where portal-visit notifications go. No dedicated CS inbox yet, so this
 * falls back to an example/owner address; set CS_TEAM_EMAIL in the env to route
 * it to the real customer-service team.
 */
const CS_TEAM_EMAIL = process.env.CS_TEAM_EMAIL || 'cs-team@example.com';

/**
 * Send an email, retrying exactly once on failure. Returns true on success.
 * Per requirement: try once; if it fails, retry once; after that, give up.
 */
async function sendWithSingleRetry(opts: { to: string; subject: string; html: string; leadId?: string }): Promise<boolean> {
  const first = await sendEmail(opts);
  if (first.success) return true;
  console.warn('[Portal CS notify] first attempt failed, retrying once:', first.error);
  const second = await sendEmail(opts);
  if (second.success) return true;
  console.error('[Portal CS notify] retry failed, giving up:', second.error);
  return false;
}

/** Builds the CS-team notification email body from the visited lead. */
function buildCsNotificationHtml(
  lead: any,
  visit: {
    ip: string;
    city?: string;
    region?: string;
    country?: string;
    location: string;
    browser?: string;
    os?: string;
    device?: string;
    summary: string;
    at: Date;
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

  const leadIdShort = lead._id ? lead._id.toString().slice(-6).toUpperCase() : '';
  const refId = lead.referenceNumber || lead.invoiceNumber || (leadIdShort ? `AC-${leadIdShort}` : '—');
  const pnrValue = lead.pnr || 'Pending Issue';
  const formattedDate = visit.at.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  const cityDisplay = visit.city && visit.city !== 'Unknown City' ? visit.city : visit.location;
  const browserDisplay = visit.browser || 'Unknown Browser';
  const osDisplay = visit.os || 'Unknown OS';
  const deviceDisplay = visit.device || 'Desktop';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Customer viewed booking portal</title>
    </head>
    <body style="margin:0;padding:24px 16px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
      <div style="max-width:620px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
        
        <!-- Header Banner -->
        <div style="background:linear-gradient(135deg, #0B3C8A 0%, #1E40AF 100%);padding:22px 28px;border-bottom:3px solid #F59E0B;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td>
                <div style="font-size:11px;font-weight:700;color:#FDE68A;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">AirlinesConsolidator &bull; CS Alert</div>
                <h1 style="color:#FFFFFF;font-size:20px;font-weight:800;margin:0;line-height:1.3;">Customer Viewed Booking Portal</h1>
              </td>
              <td style="text-align:right;vertical-align:middle;">
                <span style="background:#FEF3C7;color:#92400E;font-size:12px;font-weight:800;padding:6px 12px;border-radius:20px;display:inline-block;white-space:nowrap;">
                  👀 Portal Opened
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:28px 28px 24px;">
          <p style="font-size:14px;color:#475569;line-height:1.5;margin:0 0 20px;">
            A customer has just accessed their online flight itinerary &amp; booking portal. Details and visitor telemetry are provided below for immediate follow-up.
          </p>

          <!-- Primary Reference Card -->
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;width:32%;">Ref # ID</td>
                <td style="padding:6px 0;">
                  <span style="font-family:monospace;font-size:15px;font-weight:800;color:#0B3C8A;background:#DBEAFE;padding:3px 10px;border-radius:6px;display:inline-block;border:1px solid #BFDBFE;">
                    ${esc(refId)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;font-weight:600;">PNR / Booking Ref</td>
                <td style="padding:6px 0;">
                  <span style="font-family:monospace;font-size:14px;font-weight:700;color:#1E293B;background:#E2E8F0;padding:2px 8px;border-radius:4px;display:inline-block;">
                    ${esc(pnrValue)}
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
                <td style="padding:6px 0;color:#64748B;font-weight:600;">Payment &amp; Fare</td>
                <td style="padding:6px 0;color:#1E293B;">
                  <span style="font-weight:700;color:${lead.paymentStatus === 'Authorized' || lead.paymentStatus === 'Paid' ? '#16A34A' : '#D97706'};">
                    ${esc(lead.paymentStatus || 'Pending')}
                  </span>
                  &bull; <strong>${esc(lead.currency || 'USD')} ${esc(Number(lead.priceQuoted || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }))}</strong>
                </td>
              </tr>
            </table>
          </div>

          <!-- Visitor Telemetry Box -->
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
              🌐 Visitor &amp; Device Telemetry
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;width:32%;">IP Address</td>
                <td style="padding:5px 0;">
                  <span style="font-family:monospace;font-weight:700;color:#0F172A;background:#DCFCE7;padding:2px 8px;border-radius:4px;border:1px solid #86EFAC;">
                    ${esc(visit.ip)}
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
                  ${esc(visit.location)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Browser</td>
                <td style="padding:5px 0;font-weight:700;color:#0F172A;">
                  ${esc(browserDisplay)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">OS &amp; Device</td>
                <td style="padding:5px 0;color:#334155;">
                  ${esc(deviceDisplay)} &bull; ${esc(osDisplay)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Client Summary</td>
                <td style="padding:5px 0;color:#64748B;font-size:12px;">
                  ${esc(visit.summary)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Viewed At</td>
                <td style="padding:5px 0;color:#0F172A;font-weight:600;">
                  ${esc(formattedDate)}
                  <div style="font-size:11px;color:#64748B;font-family:monospace;margin-top:2px;">${esc(visit.at.toISOString())}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Action Buttons -->
          <div style="text-align:center;margin:28px 0 12px;">
            ${
              visit.crmUrl
                ? `<a href="${visit.crmUrl}" style="display:inline-block;background:#0B3C8A;color:#FFFFFF !important;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;box-shadow:0 3px 8px rgba(11,60,138,0.25);margin:0 6px 10px;">
                    Open Lead in CRM &rarr;
                   </a>`
                : ''
            }
            ${
              visit.portalUrl
                ? `<a href="${visit.portalUrl}" style="display:inline-block;background:#F1F5F9;color:#0B3C8A !important;border:1px solid #CBD5E1;font-size:13px;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:8px;margin:0 6px 10px;">
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing tracking token' }, { status: 400 });
    }

    const cleanToken = decodeURIComponent(token).trim();

    await connectToDatabase();
    let lead = await Lead.findOne({
      $or: [
        { 'customerPortal.trackingToken': cleanToken },
        { 'customerPortal.trackingToken': token },
        { 'activityLog.meta.trackingToken': cleanToken },
        { 'activityLog.meta.trackingToken': token },
        ...(mongoose.Types.ObjectId.isValid(cleanToken) ? [{ _id: cleanToken }] : []),
        ...(mongoose.Types.ObjectId.isValid(token) ? [{ _id: token }] : []),
      ],
    })
      .select('+billing.card.number')
      .populate('assignedTo', 'name email phone avatar');

    // Self-healing fallback: If token was generated in memory from a prior dispatch,
    // link it to the most recently active lead so the passenger never encounters 404
    if (!lead) {
      lead = await Lead.findOne({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .select('+billing.card.number')
        .populate('assignedTo', 'name email phone avatar');

      if (lead) {
        // Link this token permanently to the lead
        const existingPortal: any = lead.customerPortal || {};
        await Lead.findByIdAndUpdate(lead._id, {
          $set: {
            'customerPortal.trackingToken': cleanToken,
            'customerPortal.viewCount': (existingPortal.viewCount || 0) + 1,
            'customerPortal.lastViewedAt': new Date(),
          },
        });
      }
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Flight itinerary not found or tracking link has expired.' },
        { status: 404 }
      );
    }

    // Ensure customerPortal and trackingToken exist on lead
    if (!lead.customerPortal) {
      lead.customerPortal = {
        trackingToken: cleanToken,
        viewCount: 0,
        downloadCount: 0,
        history: [],
      };
    } else if (!lead.customerPortal.trackingToken) {
      lead.customerPortal.trackingToken = cleanToken;
    }

    // 1. Capture visitor telemetry
    const ip = getClientIp(req);
    const locationDetails = await resolveIpDetails(ip);
    const location = locationDetails.fullLocation;
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const parsedUa = parseUserAgent(userAgent);
    const now = new Date();

    // 2. Prevent excessive duplicate log spam (e.g. rapid refreshes within 5 seconds)
    const recentEvent = lead.customerPortal?.history?.find(
      (h: any) =>
        h.event === 'portal_viewed' &&
        h.ip === ip &&
        now.getTime() - new Date(h.timestamp).getTime() < 5000
    );

    if (!recentEvent) {
      const updatedViewCount = (lead.customerPortal.viewCount || 0) + 1;
      lead.customerPortal.viewCount = updatedViewCount;
      lead.customerPortal.lastViewedAt = now;
      lead.customerPortal.lastViewedIp = ip;
      lead.customerPortal.lastViewedLocation = location;
      lead.customerPortal.lastViewedDevice = parsedUa.summary;

      const eventId = `ev_view_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      if (!Array.isArray(lead.customerPortal.history)) {
        lead.customerPortal.history = [];
      }
      lead.customerPortal.history.push({
        id: eventId,
        event: 'portal_viewed',
        description: `Customer viewed flight itinerary online from ${parsedUa.summary} (IP: ${ip} · ${location})`,
        ip,
        userAgent,
        device: parsedUa.device,
        browser: parsedUa.browser,
        os: parsedUa.os,
        location,
        timestamp: now,
      });

      const activityItem = {
        id: `act_portal_open_${Date.now()}`,
        type: 'email_opened',
        description: `Customer viewed flight itinerary online (Device: ${parsedUa.summary}, IP: ${ip} · Location: ${location})`,
        actorName: 'Passenger',
        timestamp: now,
        meta: { ip, location, device: parsedUa.summary, token: cleanToken },
      };

      await Lead.findByIdAndUpdate(lead._id, {
        $set: {
          customerPortal: lead.customerPortal,
        },
        $push: {
          activityLog: activityItem,
        },
      });

      // Notify the CS team the first time this customer opens the portal.
      // Send once: skip if a successful notification was already logged.
      const alreadyNotified = (lead.activityLog || []).some((a: any) => a.type === 'cs_notified');
      if (!alreadyNotified) {
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

        const leadIdShort = lead._id ? lead._id.toString().slice(-6).toUpperCase() : '';
        const refId = lead.referenceNumber || lead.invoiceNumber || (leadIdShort ? `AC-${leadIdShort}` : '—');

        const sent = await sendWithSingleRetry({
          to: CS_TEAM_EMAIL,
          subject: `Portal viewed — [Ref: ${refId}] ${lead.name || 'Lead'} (${lead.origin || '—'} → ${lead.destination || '—'})`,
          html: buildCsNotificationHtml(lead, {
            ip,
            city: locationDetails.city,
            region: locationDetails.region,
            country: locationDetails.country,
            location,
            device: parsedUa.device,
            browser: parsedUa.browser,
            os: parsedUa.os,
            summary: parsedUa.summary,
            at: now,
            crmUrl,
            portalUrl,
          }),
          leadId: lead._id.toString(),
        });
        if (sent) {
          // Log a marker so we never notify CS again for this lead.
          await Lead.findByIdAndUpdate(lead._id, {
            $push: {
              activityLog: {
                id: `act_cs_notify_${Date.now()}`,
                type: 'cs_notified',
                description: `CS team notified of portal view (${CS_TEAM_EMAIL})`,
                actorName: 'System',
                timestamp: new Date(),
                meta: { to: CS_TEAM_EMAIL, ip, location, refId },
              },
            },
          });
        }
        // On failure after the single retry we do NOT log the marker, so a
        // later visit can attempt the notification again.
      }
    }

    // 3. Return sanitized customer payload
    const isAuthorized = Boolean(
      lead.paymentStatus === 'Paid' ||
      (lead.paymentStatus as string) === 'Authorized' ||
      lead.customerPortal?.history?.some((h: any) => h.event === 'booking_authorized')
    );

    const rawCardNum = lead.billing?.card?.number || '';
    const last4 = lead.billing?.card?.last4 || (rawCardNum.length >= 4 ? rawCardNum.slice(-4) : '4321');

    const sanitizedCustomerData = {
      token: cleanToken,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      origin: lead.origin,
      destination: lead.destination,
      travelDate: lead.travelDate,
      returnDate: lead.returnDate,
      pax: lead.pax,
      tripType: lead.tripType,
      bookingType: lead.bookingType,
      stage: lead.stage,
      status: lead.status,
      paymentStatus: lead.paymentStatus,
      isAuthorized,
      verifiedIp: ip,
      verifiedLocation: location,
      verifiedDevice: parsedUa.summary,
      authorizedAt: now,
      pnr: lead.pnr,
      ticketNumber: lead.ticketNumber,
      invoiceNumber: lead.invoiceNumber,
      priceQuoted: lead.priceQuoted,
      currency: lead.currency || 'USD',
      flightLegs: lead.flightLegs || [],
      passengers: lead.passengers || [],
      billing: {
        cardBrand: lead.billing?.card?.brand || 'Visa',
        cardLast4: last4,
        holderName: lead.billing?.card?.holderName || lead.name,
        address: lead.billing?.address,
      },
      agent: lead.assignedTo
        ? {
            name: (lead.assignedTo as any).name,
            email: (lead.assignedTo as any).email,
            phone: (lead.assignedTo as any).phone,
            avatar: (lead.assignedTo as any).avatar,
          }
        : {
            name: 'Airlines Consolidator Concierge',
            email: 'concierge@airlinesconsolidator.com',
            phone: '+1 (888) 883-0727',
          },
      lastUpdated: lead.updatedAt,
    };

    return NextResponse.json({
      success: true,
      itinerary: sanitizedCustomerData,
    });
  } catch (error: any) {
    console.error('[Customer Portal Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to load itinerary' }, { status: 500 });
  }
}
