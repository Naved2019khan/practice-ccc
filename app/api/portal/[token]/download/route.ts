import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp } from '@/lib/tracking';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const cleanToken = decodeURIComponent(token).trim();

    await connectToDatabase();
    const lead = await Lead.findOne({
      $or: [
        { 'customerPortal.trackingToken': cleanToken },
        { 'customerPortal.trackingToken': token },
        ...(mongoose.Types.ObjectId.isValid(cleanToken) ? [{ _id: cleanToken }] : []),
        ...(mongoose.Types.ObjectId.isValid(token) ? [{ _id: token }] : []),
      ],
    });

    if (!lead) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
    }

    const attachment = lead.attachments?.find((a: any) => a.id === attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Telemetry
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const parsedUa = parseUserAgent(userAgent);
    const now = new Date();

    if (!lead.customerPortal) {
      lead.customerPortal = {
        trackingToken: cleanToken,
        viewCount: 0,
        downloadCount: 1,
        history: [],
      };
    } else {
      lead.customerPortal.downloadCount = (lead.customerPortal.downloadCount || 0) + 1;
    }

    const eventId = `ev_dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    if (!Array.isArray(lead.customerPortal.history)) {
      lead.customerPortal.history = [];
    }
    lead.customerPortal.history.push({
      id: eventId,
      event: 'ticket_downloaded',
      description: `Customer downloaded ticket "${attachment.originalName}" from ${parsedUa.summary} (IP: ${ip})`,
      ip,
      userAgent,
      device: parsedUa.device,
      browser: parsedUa.browser,
      os: parsedUa.os,
      meta: { attachmentId: attachment.id, fileName: attachment.originalName },
      timestamp: now,
    });

    const activityItem = {
      id: `act_ticket_dl_${Date.now()}`,
      type: 'ticket_downloaded',
      description: `Ticket "${attachment.originalName}" downloaded by customer (IP: ${ip})`,
      actorName: 'Passenger',
      timestamp: now,
      meta: { attachmentId: attachment.id, fileName: attachment.originalName, ip },
    };

    await Lead.findByIdAndUpdate(lead._id, {
      $set: {
        customerPortal: lead.customerPortal,
      },
      $push: {
        activityLog: activityItem,
      },
    });

    // If attachment has external URL or S3 URL, redirect to it; if data URL, return base64
    if (attachment.url.startsWith('data:')) {
      const parts = attachment.url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const buffer = Buffer.from(parts[1], 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
        },
      });
    }

    return NextResponse.redirect(attachment.url, 302);
  } catch (error: any) {
    console.error('[Ticket Download Tracking Error]:', error);
    return NextResponse.json({ error: error.message || 'Download error' }, { status: 500 });
  }
}
