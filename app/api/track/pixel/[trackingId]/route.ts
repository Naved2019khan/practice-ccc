import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp, resolveIpLocation } from '@/lib/tracking';
import mongoose from 'mongoose';

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const token = searchParams.get('token') || trackingId;

    const ip = getClientIp(req);
    const location = await resolveIpLocation(ip);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const parsedUa = parseUserAgent(userAgent);
    const now = new Date();

    await connectToDatabase();

    let lead: any = null;
    if (token) {
      lead = await Lead.findOne({ 'customerPortal.trackingToken': token });
    }
    if (!lead && leadId && mongoose.Types.ObjectId.isValid(leadId)) {
      lead = await Lead.findById(leadId);
    }

    if (lead) {
      if (!lead.emailTrackingEvents) {
        lead.emailTrackingEvents = [];
      }

      lead.emailTrackingEvents.push({
        trackingId,
        type: 'open',
        ip,
        userAgent,
        timestamp: now,
      });

      if (!lead.customerPortal) {
        lead.customerPortal = {
          trackingToken: token,
          viewCount: 1,
          downloadCount: 0,
          history: [],
        };
      }

      lead.customerPortal.lastViewedAt = now;
      lead.customerPortal.lastViewedIp = ip;
      lead.customerPortal.lastViewedLocation = location;
      lead.customerPortal.lastViewedDevice = parsedUa.summary;

      lead.customerPortal.history.push({
        id: `ev_pix_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        event: 'portal_viewed',
        description: `Customer opened email tracking pixel from ${parsedUa.summary} (IP: ${ip} · ${location})`,
        ip,
        userAgent,
        device: parsedUa.device,
        browser: parsedUa.browser,
        os: parsedUa.os,
        location,
        timestamp: now,
      });

      lead.activityLog.push({
        id: `act_track_open_${Date.now()}`,
        type: 'email_opened',
        description: `Email opened by client from ${parsedUa.summary} (IP: ${ip} · Location: ${location})`,
        actorName: 'Passenger',
        timestamp: now,
        meta: { trackingId, ip, location, device: parsedUa.summary },
      });

      await lead.save();
    }
  } catch (error) {
    console.error('Tracking pixel error:', error);
  }

  return new NextResponse(PIXEL_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': PIXEL_GIF.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
