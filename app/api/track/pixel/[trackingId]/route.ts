import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import mongoose from 'mongoose';

// 1x1 transparent GIF base64
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

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (leadId && mongoose.Types.ObjectId.isValid(leadId)) {
      await connectToDatabase();
      const lead = await Lead.findById(leadId);

      if (lead) {
        lead.emailTrackingEvents.push({
          trackingId,
          type: 'open',
          ip,
          userAgent,
          timestamp: new Date(),
        });

        lead.activityLog.push({
          id: `act_track_open_${Date.now()}`,
          type: 'email_opened',
          description: `Email opened by client (IP: ${ip})`,
          actorName: 'Recipient',
          timestamp: new Date(),
          meta: { trackingId, ip, userAgent },
        });

        await lead.save();
      }
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
