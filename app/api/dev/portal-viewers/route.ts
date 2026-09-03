import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';

/**
 * GET /api/dev/portal-viewers
 * Dev-only. Returns every lead that has either:
 *   • at least one portal_viewed event in customerPortal.history, OR
 *   • at least one booking_authorized event (payment Authorized / Paid)
 * Each row includes an `isAuthorized` flag so the UI can filter/badge accordingly.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const leads = await Lead.find({
      $or: [
        // viewed the portal
        {
          'customerPortal.history': {
            $elemMatch: { event: 'portal_viewed' },
          },
        },
        // authorized (clicked confirm) — may not have a portal_viewed entry
        {
          'customerPortal.history': {
            $elemMatch: { event: 'booking_authorized' },
          },
        },
        // payment status already flipped by the authorize route
        { paymentStatus: { $in: ['Authorized', 'Paid'] } },
      ],
    })
      .select(
        'name email phone origin destination travelDate stage status paymentStatus ' +
          'referenceNumber invoiceNumber pnr totalAmount currency ' +
          'customerPortal.trackingToken customerPortal.viewCount ' +
          'customerPortal.lastViewedAt customerPortal.lastViewedIp ' +
          'customerPortal.lastViewedLocation customerPortal.lastViewedDevice ' +
          'customerPortal.history customerPortal.lastSentTo ' +
          'activityLog createdAt updatedAt'
      )
      .sort({ 'customerPortal.lastViewedAt': -1 })
      .lean();

    const viewers = leads.map((lead: any) => {
      const history: any[] = lead.customerPortal?.history ?? [];
      const activityLog: any[] = lead.activityLog ?? [];

      const viewEvents = history.filter((h) => h.event === 'portal_viewed');
      const authEvents = history.filter((h) => h.event === 'booking_authorized');

      const isAuthorized =
        lead.paymentStatus === 'Authorized' ||
        lead.paymentStatus === 'Paid' ||
        authEvents.length > 0 ||
        activityLog.some((a: any) => a.type === 'booking_authorized' || a.type === 'cs_auth_notified');

      // last view — prefer portal_viewed, fall back to any auth event
      const lastView =
        viewEvents.reduce(
          (latest: any, h: any) =>
            !latest || new Date(h.timestamp) > new Date(latest.timestamp) ? h : latest,
          null
        ) ??
        authEvents.reduce(
          (latest: any, h: any) =>
            !latest || new Date(h.timestamp) > new Date(latest.timestamp) ? h : latest,
          null
        );

      const firstView =
        viewEvents.reduce(
          (earliest: any, h: any) =>
            !earliest || new Date(h.timestamp) < new Date(earliest.timestamp) ? h : earliest,
          null
        ) ??
        authEvents.reduce(
          (earliest: any, h: any) =>
            !earliest || new Date(h.timestamp) < new Date(earliest.timestamp) ? h : earliest,
          null
        );

      // last authorization event detail
      const lastAuth = authEvents.reduce(
        (latest: any, h: any) =>
          !latest || new Date(h.timestamp) > new Date(latest.timestamp) ? h : latest,
        null
      );

      const uniqueIps = [
        ...new Set(
          [...viewEvents, ...authEvents].map((h: any) => h.ip).filter(Boolean)
        ),
      ];
      const uniqueDevices = [
        ...new Set(
          [...viewEvents, ...authEvents].map((h: any) => h.device).filter(Boolean)
        ),
      ];

      return {
        _id: lead._id,
        name: lead.name || '—',
        email: lead.email || null,
        phone: lead.phone || '—',
        origin: lead.origin || '—',
        destination: lead.destination || '—',
        travelDate: lead.travelDate ?? null,
        stage: lead.stage,
        status: lead.status,
        paymentStatus: lead.paymentStatus,
        totalAmount: lead.totalAmount ?? 0,
        currency: lead.currency || 'USD',
        referenceNumber: lead.referenceNumber || lead.invoiceNumber || null,
        pnr: lead.pnr || null,
        trackingToken: lead.customerPortal?.trackingToken ?? null,
        isAuthorized,
        // view metrics
        viewCount: lead.customerPortal?.viewCount ?? viewEvents.length,
        lastViewedAt: lead.customerPortal?.lastViewedAt ?? lastView?.timestamp ?? null,
        lastViewedIp: lead.customerPortal?.lastViewedIp ?? lastView?.ip ?? null,
        lastViewedLocation: lead.customerPortal?.lastViewedLocation ?? lastView?.location ?? null,
        lastViewedDevice: lead.customerPortal?.lastViewedDevice ?? lastView?.device ?? null,
        firstViewedAt: firstView?.timestamp ?? null,
        uniqueIpCount: uniqueIps.length,
        uniqueDevices,
        sentTo: lead.customerPortal?.lastSentTo ?? lead.email ?? null,
        // authorization detail
        authorizedAt: lastAuth?.timestamp ?? null,
        authorizedIp: lastAuth?.ip ?? null,
        authorizedLocation: lastAuth?.location ?? null,
        authorizedDevice: lastAuth?.device ?? null,
      };
    });

    return NextResponse.json({ viewers, total: viewers.length });
  } catch (err: any) {
    console.error('[Dev Portal Viewers GET]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
