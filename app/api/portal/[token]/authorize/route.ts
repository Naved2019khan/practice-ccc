import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp, resolveIpLocation } from '@/lib/tracking';
import mongoose from 'mongoose';

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
  const location = await resolveIpLocation(ip);
  const userAgent = req.headers.get('user-agent') || 'Unknown';
  const parsedUa = parseUserAgent(userAgent);
  const now = new Date();

  const bookingRef =
    lead.invoiceNumber ||
    lead.pnr ||
    `AC-${lead._id.toString().slice(-6).toUpperCase()}`;

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
