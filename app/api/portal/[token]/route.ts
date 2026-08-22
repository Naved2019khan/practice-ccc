import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp } from '@/lib/tracking';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing tracking token' }, { status: 400 });
    }

    await connectToDatabase();
    const lead = await Lead.findOne({ 'customerPortal.trackingToken': token }).populate(
      'assignedTo',
      'name email phone avatar'
    );

    if (!lead) {
      return NextResponse.json(
        { error: 'Flight itinerary not found or tracking link has expired.' },
        { status: 404 }
      );
    }

    // 1. Capture visitor telemetry
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const parsedUa = parseUserAgent(userAgent);
    const now = new Date();

    // 2. Prevent excessive duplicate log spam (e.g. rapid refreshes in same 5 seconds)
    const recentEvent = lead.customerPortal?.history?.find(
      (h: any) =>
        h.event === 'portal_viewed' &&
        h.ip === ip &&
        now.getTime() - new Date(h.timestamp).getTime() < 5000
    );

    if (!recentEvent) {
      if (!lead.customerPortal) {
        lead.customerPortal = {
          trackingToken: token,
          viewCount: 1,
          downloadCount: 0,
          history: [],
        };
      } else {
        lead.customerPortal.viewCount = (lead.customerPortal.viewCount || 0) + 1;
      }

      lead.customerPortal.lastViewedAt = now;
      lead.customerPortal.lastViewedIp = ip;
      lead.customerPortal.lastViewedDevice = parsedUa.summary;

      const eventId = `ev_view_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      lead.customerPortal.history.push({
        id: eventId,
        event: 'portal_viewed',
        description: `Customer viewed flight itinerary online from ${parsedUa.summary} (IP: ${ip})`,
        ip,
        userAgent,
        device: parsedUa.device,
        browser: parsedUa.browser,
        os: parsedUa.os,
        timestamp: now,
      });

      lead.activityLog.push({
        id: `act_portal_open_${Date.now()}`,
        type: 'email_opened',
        description: `Customer viewed flight itinerary online (Device: ${parsedUa.summary}, IP: ${ip})`,
        actorName: 'Passenger',
        timestamp: now,
        meta: { ip, device: parsedUa.summary, token },
      });

      await lead.save();
    }

    // 3. Return sanitized customer payload (never expose internal staff notes, credit card raw numbers, etc.)
    const sanitizedCustomerData = {
      token,
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
      pnr: lead.pnr,
      invoiceNumber: lead.invoiceNumber,
      priceQuoted: lead.priceQuoted,
      currency: lead.currency || 'USD',
      attachments: (lead.attachments || []).map((att: any) => ({
        id: att.id,
        fileName: att.fileName,
        originalName: att.originalName,
        fileSize: att.fileSize,
        formattedSize: att.formattedSize,
        fileType: att.fileType,
        url: att.url,
        uploadedAt: att.uploadedAt,
      })),
      agent: lead.assignedTo
        ? {
            name: (lead.assignedTo as any).name,
            email: (lead.assignedTo as any).email,
            phone: (lead.assignedTo as any).phone,
            avatar: (lead.assignedTo as any).avatar,
          }
        : {
            name: 'Ember Flight VIP Concierge',
            email: 'concierge@flightcrm.com',
            phone: '+1 (800) 555-0199',
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
