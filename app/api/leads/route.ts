import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { getNextRoundRobinStaff } from '@/lib/assignment';
import { validateLeadForm, digitsOnly } from '@/lib/validation';
import { normalizeBilling } from '@/lib/billing';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { extractRouteFromHtml } from '@/lib/pnrHtmlExtract';
import {
  isBookingType,
  isLeadStatus,
  DEFAULT_BOOKING_TYPE,
  DEFAULT_LEAD_STATUS,
} from '@/lib/leadOptions';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const isSummary = searchParams.get('summary') === 'true';
    const search = searchParams.get('search')?.trim() || '';
    const stage = searchParams.get('stage')?.trim() || '';
    const bookingType = searchParams.get('bookingType')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const source = searchParams.get('source')?.trim() || '';
    const paymentStatus = searchParams.get('paymentStatus')?.trim() || '';
    const staffId = searchParams.get('staffId')?.trim() || '';
    const urgency = searchParams.get('urgency')?.trim() || ''; // 'overdue', 'today', 'upcoming'

    // Base query with RBAC
    const query: any = {};

    if (user.role === 'staff') {
      // Staff can ONLY see leads assigned to them
      query.assignedTo = user._id;
    } else if (staffId) {
      if (staffId === 'unassigned') {
        query.assignedTo = null;
      } else if (mongoose.Types.ObjectId.isValid(staffId)) {
        query.assignedTo = new mongoose.Types.ObjectId(staffId);
      }
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // If summary is requested, return counts
    if (isSummary) {
      const totalLeads = await Lead.countDocuments(query);
      const newLeadsToday = await Lead.countDocuments({
        ...query,
        createdAt: { $gte: todayStart },
      });

      const dueToday = await Lead.countDocuments({
        ...query,
        stage: { $nin: ['Ticketed', 'Lost'] },
        nextFollowUpDate: { $gte: todayStart, $lt: tomorrowStart },
      });

      const overdue = await Lead.countDocuments({
        ...query,
        stage: { $nin: ['Ticketed', 'Lost'] },
        nextFollowUpDate: { $lt: todayStart },
      });

      const ticketedLeads = await Lead.find({ ...query, stage: 'Ticketed' });
      const bookedRevenue = ticketedLeads.reduce((sum, l) => sum + (l.priceQuoted || 0), 0);

      // Stage breakdown
      const stages = ['New', 'Contacted', 'Quoted', 'Negotiation', 'Booked', 'Ticketed', 'Lost'];
      const stageCounts: Record<string, number> = {};
      for (const s of stages) {
        stageCounts[s] = await Lead.countDocuments({ ...query, stage: s });
      }

      return NextResponse.json({
        counts: {
          total: totalLeads,
          newToday: newLeadsToday,
          dueToday,
          overdue,
          bookedRevenue,
          conversionRate: totalLeads > 0 ? Math.round((stageCounts['Ticketed'] / totalLeads) * 100) : 0,
          stages: stageCounts,
        },
      });
    }

    // Apply Filters
    if (stage) query.stage = stage;
    // Leads created before these fields existed have no stored value and fall
    // back to the schema default on read. Matching `null` (which in MongoDB also
    // matches a missing path) keeps them visible under the default filter
    // instead of silently dropping them.
    if (bookingType) {
      query.bookingType =
        bookingType === DEFAULT_BOOKING_TYPE ? { $in: [bookingType, null] } : bookingType;
    }
    if (status) {
      query.status = status === DEFAULT_LEAD_STATUS ? { $in: [status, null] } : status;
    }
    if (source) query.source = source;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Follow-up urgency filter
    if (urgency === 'overdue') {
      query.nextFollowUpDate = { $lt: todayStart };
      query.stage = { $nin: ['Ticketed', 'Lost'] };
    } else if (urgency === 'today') {
      query.nextFollowUpDate = { $gte: todayStart, $lt: tomorrowStart };
      query.stage = { $nin: ['Ticketed', 'Lost'] };
    } else if (urgency === 'upcoming') {
      query.nextFollowUpDate = { $gte: tomorrowStart };
      query.stage = { $nin: ['Ticketed', 'Lost'] };
    }

    // Search query across ref number, name, phone, email, origin, destination, pnr, passenger names, flight legs
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { referenceNumber: searchRegex },
        { invoiceNumber: searchRegex },
        { pnr: searchRegex },
        { ticketNumber: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { origin: searchRegex },
        { destination: searchRegex },
        { 'passengers.firstName': searchRegex },
        { 'passengers.lastName': searchRegex },
        { 'flightLegs.carrier': searchRegex },
        { 'flightLegs.flightNumber': searchRegex },
      ];

      // Handle ObjectId direct match if 24 hex characters
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email avatar role')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      email,
      source = 'Website',
      origin,
      destination,
      travelDate,
      returnDate,
      pax = 1,
      tripType = 'Round Trip',
      bookingType,
      stage = 'New',
      status,
      assignedTo: reqAssignedTo,
      paymentStatus = 'Pending',
      pnr,
      pnrHtml,
      ticketNumber,
      invoiceNumber,
      priceQuoted = 0,
      currency = 'USD',
      nextFollowUpDate,
      initialNote,
      remarks,
      billing: rawBilling,
    } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone is a required field' },
        { status: 400 }
      );
    }

    // Re-run the client-side rules server-side: the browser's validation is a
    // UX affordance, not a trust boundary. `phone` arrives with its dial code
    // already merged in, so it's split back out for the digit-count check.
    const fieldErrors = validateLeadForm({
      name,
      phone: digitsOnly(String(phone)),
      email,
      origin,
      destination,
      travelDate,
      returnDate,
      pax,
      tripType,
      passengers: body.passengers,
      priceQuoted,
      nextFollowUpDate,
      billing: rawBilling
        ? {
            email: rawBilling.email,
            phone: rawBilling.phone,
            alternatePhone: rawBilling.alternatePhone,
            postalCode: rawBilling.address?.postalCode,
            card: rawBilling.card,
          }
        : undefined,
    });

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: Object.values(fieldErrors)[0], fieldErrors },
        { status: 400 }
      );
    }

    const billing = normalizeBilling(rawBilling);

    await connectToDatabase();

    // Determine staff assignment
    let finalAssignedTo: mongoose.Types.ObjectId | null = null;
    let assignmentMethod = 'Unassigned';

    if (reqAssignedTo && mongoose.Types.ObjectId.isValid(reqAssignedTo)) {
      finalAssignedTo = new mongoose.Types.ObjectId(reqAssignedTo);
      const assignedStaff = await User.findById(finalAssignedTo);
      assignmentMethod = assignedStaff ? assignedStaff.name : 'Selected Staff';
    } else if (reqAssignedTo === null) {
      // Explicit "Unassigned" choice — leave the lead with no staff and skip
      // both self-assign and round-robin.
      finalAssignedTo = null;
      assignmentMethod = 'Unassigned';
    } else if (user.role === 'staff') {
      // Staff creating lead assigns to self
      finalAssignedTo = user._id as mongoose.Types.ObjectId;
      assignmentMethod = user.name;
    } else {
      // Try Round-Robin auto assignment
      const roundRobin = await getNextRoundRobinStaff();
      if (roundRobin.autoAssigned && roundRobin.assignedTo) {
        finalAssignedTo = roundRobin.assignedTo;
        assignmentMethod = `Auto-assigned to ${roundRobin.assignedStaffName}`;
      }
    }

    const notes = [];
    if (initialNote && initialNote.trim()) {
      notes.push({
        id: `note_${Date.now()}`,
        text: initialNote.trim(),
        authorName: user.name,
        authorRole: user.role,
        createdAt: new Date(),
      });
    }

    const activityLog = [
      {
        id: `act_${Date.now()}`,
        type: 'lead_created',
        description: `Lead created manually by ${user.name} (${assignmentMethod})`,
        actorName: user.name,
        timestamp: new Date(),
      },
    ];

    if (billing?.card?.last4) {
      activityLog.push({
        id: `act_${Date.now()}_billing`,
        type: 'billing_added',
        description: `Billing card added: ${billing.card.brand ?? 'Card'} ending ${billing.card.last4}`,
        actorName: user.name,
        timestamp: new Date(),
      });
    }

    const numPax = Math.max(1, Number(pax) || 1);

    // Passengers sync
    let finalPassengers = Array.isArray(body.passengers) && body.passengers.length > 0
      ? body.passengers.map((p: any) => ({
          id: p.id || `pax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          firstName: p.firstName?.trim() || '',
          middleName: p.middleName?.trim() || '',
          lastName: p.lastName?.trim() || '',
          type: ['Adult', 'Child', 'Infant'].includes(p.type) ? p.type : 'Adult',
          dob: p.dob || '',
          gender: ['Male', 'Female', 'Other', ''].includes(p.gender) ? p.gender : '',
          phone: p.phone?.trim() || '',
          email: p.email?.trim() || '',
        }))
      : [];

    if (finalPassengers.length === 0 && name?.trim()) {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || name.trim();
      const lastName = nameParts.slice(1).join(' ') || '';
      finalPassengers.push({
        id: `pax_${Date.now()}_1`,
        firstName,
        middleName: '',
        lastName,
        type: 'Adult',
        dob: '',
        gender: '',
        phone: phone.trim(),
        email: email?.trim() || '',
      });
      for (let i = 2; i <= numPax; i++) {
        finalPassengers.push({
          id: `pax_${Date.now()}_${i}`,
          firstName: `Passenger ${i}`,
          middleName: '',
          lastName: '',
          type: 'Adult',
          dob: '',
          gender: '',
          phone: '',
          email: '',
        });
      }
    }

    // Flight legs sync
    let finalFlightLegs = Array.isArray(body.flightLegs) && body.flightLegs.length > 0
      ? body.flightLegs.map((l: any) => ({
          id: l.id || `leg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          carrier: l.carrier?.trim() || '',
          flightNumber: l.flightNumber?.trim() || '',
          flightClass: l.flightClass?.trim() || 'Economy',
          departingAirport: l.departingAirport?.trim() || '',
          departingAt: l.departingAt || '',
          arrivingAirport: l.arrivingAirport?.trim() || '',
          arrivingAt: l.arrivingAt || '',
          meal: l.meal?.trim() || '',
          baggage: l.baggage?.trim() || '',
          seat: l.seat?.trim() || '',
        }))
      : [];

    // The form no longer collects origin/destination — they're derived from the
    // pasted itinerary HTML. Re-derive here so the route is stored even if the
    // client didn't send it.
    let resolvedOrigin = origin?.trim() || '';
    let resolvedDestination = destination?.trim() || '';
    if ((!resolvedOrigin || !resolvedDestination) && pnrHtml) {
      const fromHtml = extractRouteFromHtml(String(pnrHtml));
      resolvedOrigin = resolvedOrigin || fromHtml.origin;
      resolvedDestination = resolvedDestination || fromHtml.destination;
    }

    // Only auto-generate flight legs when a route was actually provided. The
    // form no longer collects origin/destination, so these are usually blank.
    if (finalFlightLegs.length === 0 && (resolvedOrigin || resolvedDestination)) {
      finalFlightLegs.push({
        id: `leg_${Date.now()}_1`,
        carrier: '',
        flightNumber: '',
        flightClass: 'Economy',
        departingAirport: resolvedOrigin,
        departingAt: travelDate ? new Date(travelDate).toISOString() : '',
        arrivingAirport: resolvedDestination,
        arrivingAt: travelDate ? new Date(travelDate).toISOString() : '',
      });
      if (tripType !== 'One Way' && returnDate) {
        finalFlightLegs.push({
          id: `leg_${Date.now()}_2`,
          carrier: '',
          flightNumber: '',
          flightClass: 'Economy',
          departingAirport: resolvedDestination,
          departingAt: new Date(returnDate).toISOString(),
          arrivingAirport: resolvedOrigin,
          arrivingAt: new Date(returnDate).toISOString(),
        });
      }
    }

    // Multi-city routes sync
    let finalMultiCityRoutes = Array.isArray(body.multiCityRoutes) && body.multiCityRoutes.length > 0
      ? body.multiCityRoutes.map((r: any, idx: number) => ({
          id: r.id || `route_${Date.now()}_${idx + 1}`,
          origin: r.origin?.trim() || '',
          destination: r.destination?.trim() || '',
          travelDate: r.travelDate || '',
        }))
      : [];

    if (
      tripType === 'Multi-City' &&
      finalMultiCityRoutes.length === 0 &&
      (resolvedOrigin || resolvedDestination)
    ) {
      finalMultiCityRoutes = [
        {
          id: `route_${Date.now()}_1`,
          origin: resolvedOrigin,
          destination: resolvedDestination,
          travelDate: travelDate ? new Date(travelDate).toISOString().split('T')[0] : '',
        },
      ];
    }

    const leadObjectId = new mongoose.Types.ObjectId();
    const shortCode = leadObjectId.toString().slice(-6).toUpperCase();
    const finalRef = invoiceNumber?.trim() || `AC-${shortCode}`;

    const newLead = await Lead.create({
      _id: leadObjectId,
      name: name?.trim() || '',
      phone: phone.trim(),
      email: email?.trim(),
      source,
      origin: resolvedOrigin,
      destination: resolvedDestination,
      travelDate: travelDate ? new Date(travelDate) : undefined,
      returnDate: returnDate ? new Date(returnDate) : undefined,
      pax: numPax,
      tripType,
      passengers: finalPassengers,
      flightLegs: finalFlightLegs,
      multiCityRoutes: finalMultiCityRoutes,
      addOns: body.addOns
        ? {
            meal: body.addOns.meal?.trim() || '',
            baggage: body.addOns.baggage?.trim() || '',
            seat: body.addOns.seat?.trim() || '',
            notes: body.addOns.notes?.trim() || '',
          }
        : undefined,
      // Unknown values fall back to the schema default rather than 400-ing an
      // otherwise valid lead.
      bookingType: isBookingType(bookingType) ? bookingType : DEFAULT_BOOKING_TYPE,
      stage,
      status: isLeadStatus(status) ? status : DEFAULT_LEAD_STATUS,
      assignedTo: finalAssignedTo,
      agentName: body.agentName?.trim() || (finalAssignedTo ? (await User.findById(finalAssignedTo))?.name : (user?.name || 'Concierge Team')),
      paymentStatus,
      pnr: pnr?.trim(),
      pnrHtml: sanitizeHtml(pnrHtml),
      ticketNumber: ticketNumber?.trim(),
      invoiceNumber: finalRef,
      referenceNumber: finalRef,
      priceQuoted: Number(priceQuoted) || 0,
      currency,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      remarks: remarks || initialNote || '',
      initialNote: initialNote || remarks || '',
      billing,
      notes,
      activityLog,
    });

    const populatedLead = await Lead.findById(newLead._id).populate(
      'assignedTo',
      'name email avatar role'
    );

    return NextResponse.json({ success: true, lead: populatedLead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
