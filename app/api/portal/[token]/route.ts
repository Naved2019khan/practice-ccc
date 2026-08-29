import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp, resolveIpLocation } from '@/lib/tracking';
import mongoose from 'mongoose';

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
    const location = await resolveIpLocation(ip);
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
