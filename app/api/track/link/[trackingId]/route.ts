import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url') || 'https://google.com';
  const leadId = searchParams.get('leadId');

  try {
    const { trackingId } = await params;
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
          type: 'click',
          ip,
          userAgent,
          linkUrl: targetUrl,
          timestamp: new Date(),
        });

        lead.activityLog.push({
          id: `act_track_click_${Date.now()}`,
          type: 'link_clicked',
          description: `Email link clicked: ${targetUrl} (IP: ${ip})`,
          actorName: 'Recipient',
          timestamp: new Date(),
          meta: { trackingId, ip, linkUrl: targetUrl },
        });

        await lead.save();
      }
    }
  } catch (error) {
    console.error('Link tracking error:', error);
  }

  return NextResponse.redirect(targetUrl, 302);
}
