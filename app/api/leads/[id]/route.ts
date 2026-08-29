import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { isBookingType, isLeadStatus } from '@/lib/leadOptions';
import mongoose from 'mongoose';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    await connectToDatabase();
    const lead = await Lead.findById(id)
      .select('+billing.card.number +billing.card.cvv')
      .populate('assignedTo', 'name email avatar role phone');

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Role check: Staff can only access their assigned leads
    if (user.role === 'staff' && lead.assignedTo?._id.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this lead' }, { status: 403 });
    }

    return NextResponse.json({ lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    await connectToDatabase();
    const lead = await Lead.findById(id)
      .select('+billing.card.number +billing.card.cvv')
      .populate('assignedTo', 'name email');

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // RBAC: staff can only update leads assigned to them
    if (user.role === 'staff' && lead.assignedTo?._id.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      email,
      source,
      origin,
      destination,
      travelDate,
      returnDate,
      pax,
      tripType,
      bookingType,
      stage,
      status,
      assignedTo: newAssignedToId,
      paymentStatus,
      pnr,
      ticketNumber,
      invoiceNumber,
      priceQuoted,
      currency,
      nextFollowUpDate,
      billing,
      newNote,
      newComment,
      commentId,
      replyText,
      passengers,
      flightLegs,
      multiCityRoutes,
      addOns,
    } = body;

    // 1. Check for Reassignment (Admin only)
    if (newAssignedToId !== undefined) {
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only administrators can reassign leads' },
          { status: 403 }
        );
      }

      const currentStaffName = lead.assignedTo ? (lead.assignedTo as any).name : 'Unassigned';
      let targetStaffName = 'Unassigned';
      let targetObjectId: mongoose.Types.ObjectId | null = null;

      if (newAssignedToId && mongoose.Types.ObjectId.isValid(newAssignedToId)) {
        const targetStaff = await User.findById(newAssignedToId);
        if (targetStaff) {
          targetStaffName = targetStaff.name;
          targetObjectId = targetStaff._id as mongoose.Types.ObjectId;
        }
      }

      if (
        (lead.assignedTo?._id?.toString() || '') !== (targetObjectId?.toString() || '')
      ) {
        lead.assignedTo = targetObjectId;
        lead.activityLog.push({
          id: `act_${Date.now()}`,
          type: 'reassigned',
          description: `Lead reassigned from ${currentStaffName} to ${targetStaffName} by ${user.name}`,
          actorName: user.name,
          timestamp: new Date(),
          meta: { from: currentStaffName, to: targetStaffName },
        });
      }
    }

    // 2. Check for Stage Transition
    if (stage && stage !== lead.stage) {
      const oldStage = lead.stage;
      lead.stage = stage;
      lead.activityLog.push({
        id: `act_${Date.now()}`,
        type: 'stage_changed',
        description: `Stage changed from "${oldStage}" to "${stage}" by ${user.name}`,
        actorName: user.name,
        timestamp: new Date(),
        meta: { oldStage, newStage: stage },
      });
    }

    // 2b. Status and Booking Type transitions
    if (isLeadStatus(status) && status !== lead.status) {
      const oldStatus = lead.status;
      lead.status = status;
      lead.activityLog.push({
        id: `act_${Date.now()}_status`,
        type: 'status_changed',
        description: `Status changed from "${oldStatus}" to "${status}" by ${user.name}`,
        actorName: user.name,
        timestamp: new Date(),
        meta: { oldStatus, newStatus: status },
      });
    }

    if (isBookingType(bookingType) && bookingType !== lead.bookingType) {
      const oldBookingType = lead.bookingType;
      lead.bookingType = bookingType;
      lead.activityLog.push({
        id: `act_${Date.now()}_booking`,
        type: 'booking_type_changed',
        description: `Booking type changed from "${oldBookingType}" to "${bookingType}" by ${user.name}`,
        actorName: user.name,
        timestamp: new Date(),
        meta: { oldBookingType, newBookingType: bookingType },
      });
    }

    // 3. Check for New Note
    if (newNote && newNote.trim()) {
      const noteItem = {
        id: `note_${Date.now()}`,
        text: newNote.trim(),
        authorName: user.name,
        authorRole: user.role,
        createdAt: new Date(),
      };
      lead.notes.push(noteItem);
      lead.activityLog.push({
        id: `act_${Date.now()}`,
        type: 'note_added',
        description: `Note added by ${user.name}`,
        actorName: user.name,
        timestamp: new Date(),
      });
    }

    // 4. Check for New Comment
    if (newComment && newComment.trim()) {
      lead.comments.push({
        id: `cmt_${Date.now()}`,
        text: newComment.trim(),
        authorName: user.name,
        authorRole: user.role,
        createdAt: new Date(),
        replies: [],
      });
    }

    // 5. Check for Reply to existing comment
    if (commentId && replyText && replyText.trim()) {
      const comment = lead.comments.find((c: any) => c.id === commentId);
      if (comment) {
        comment.replies.push({
          id: `reply_${Date.now()}`,
          text: replyText.trim(),
          authorName: user.name,
          authorRole: user.role,
          createdAt: new Date(),
        });
      }
    }

    const parseDateSafe = (val: any): Date | undefined => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    };

    // 6. Update basic fields
    if (name !== undefined && name.trim()) lead.name = name.trim();
    if (phone !== undefined && phone.trim()) lead.phone = phone.trim();
    if (email !== undefined) lead.email = email?.trim() || '';
    if (source !== undefined) lead.source = source;
    if (origin !== undefined && origin.trim()) lead.origin = origin.trim();
    if (destination !== undefined && destination.trim()) lead.destination = destination.trim();
    if (travelDate !== undefined) lead.travelDate = parseDateSafe(travelDate);
    if (returnDate !== undefined) lead.returnDate = parseDateSafe(returnDate);
    if (pax !== undefined) lead.pax = Math.max(1, Number(pax) || 1);
    if (tripType !== undefined) lead.tripType = tripType;
    if (paymentStatus !== undefined) lead.paymentStatus = paymentStatus;
    if (pnr !== undefined) lead.pnr = pnr?.trim() || '';
    if (ticketNumber !== undefined) lead.ticketNumber = ticketNumber?.trim() || '';
    if (invoiceNumber !== undefined) lead.invoiceNumber = invoiceNumber?.trim() || '';
    if (priceQuoted !== undefined) lead.priceQuoted = isNaN(Number(priceQuoted)) ? 0 : Number(priceQuoted);
    if (currency !== undefined) lead.currency = currency;
    if (nextFollowUpDate !== undefined) lead.nextFollowUpDate = parseDateSafe(nextFollowUpDate);

    // 7a. Passengers
    if (Array.isArray(passengers)) {
      const cleanedPassengers = passengers.map((p: any) => ({
        id: p.id || `pax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        firstName: p.firstName?.trim() || '',
        lastName: p.lastName?.trim() || '',
        dob: p.dob || '',
        gender: ['Male', 'Female', 'Other', ''].includes(p.gender) ? p.gender : '',
        phone: p.phone?.trim() || '',
        email: p.email?.trim() || '',
      }));
      lead.set('passengers', cleanedPassengers);
    }

    // 7b. Flight Legs
    if (Array.isArray(flightLegs)) {
      const cleanedLegs = flightLegs.map((l: any) => ({
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
      }));
      lead.set('flightLegs', cleanedLegs);

      // Auto-sync origin/destination from legs only if the form didn't provide them
      const leg0 = cleanedLegs[0];
      if (!origin?.trim() && leg0?.departingAirport) {
        lead.origin = leg0.departingAirport;
      }
      const lastLeg = cleanedLegs[cleanedLegs.length - 1];
      if (!destination?.trim() && lastLeg?.arrivingAirport) {
        lead.destination = lastLeg.arrivingAirport;
      }
    }

    // 7c. Multi-City Routes
    if (Array.isArray(multiCityRoutes)) {
      const cleanedRoutes = multiCityRoutes.map((r: any, idx: number) => ({
        id: r.id || `route_${Date.now()}_${idx + 1}`,
        origin: r.origin?.trim() || '',
        destination: r.destination?.trim() || '',
        travelDate: r.travelDate || '',
      }));
      lead.set('multiCityRoutes', cleanedRoutes);
    }

    // 7d. Add-ons & Ancillary Services
    if (addOns !== undefined) {
      lead.set('addOns', {
        meal: addOns.meal?.trim() || '',
        baggage: addOns.baggage?.trim() || '',
        seat: addOns.seat?.trim() || '',
        notes: addOns.notes?.trim() || '',
      });
    }

    // 8. Update Billing & Card details
    if (billing !== undefined) {
      if (!lead.billing) {
        lead.billing = {};
      }
      if (billing.email !== undefined) lead.billing.email = billing.email?.trim() || undefined;
      if (billing.phone !== undefined) lead.billing.phone = billing.phone?.trim() || undefined;
      if (billing.phoneDialCode !== undefined) lead.billing.phoneDialCode = billing.phoneDialCode?.trim() || undefined;
      if (billing.phoneCountryCode !== undefined) lead.billing.phoneCountryCode = billing.phoneCountryCode?.trim() || undefined;
      if (billing.alternatePhone !== undefined) lead.billing.alternatePhone = billing.alternatePhone?.trim() || undefined;
      if (billing.country !== undefined) lead.billing.country = billing.country?.trim() || undefined;
      if (billing.countryCode !== undefined) lead.billing.countryCode = billing.countryCode?.trim() || undefined;

      if (billing.address !== undefined) {
        if (!lead.billing.address) lead.billing.address = {};
        lead.billing.address.line1 = billing.address?.line1?.trim() || undefined;
        lead.billing.address.line2 = billing.address?.line2?.trim() || undefined;
        lead.billing.address.city = billing.address?.city?.trim() || undefined;
        lead.billing.address.state = billing.address?.state?.trim() || undefined;
        lead.billing.address.postalCode = billing.address?.postalCode?.trim() || undefined;
      }

      if (billing.card !== undefined) {
        if (!lead.billing.card) lead.billing.card = {};
        if (billing.card.holderName !== undefined) lead.billing.card.holderName = billing.card.holderName?.trim() || undefined;
        if (billing.card.number !== undefined) {
          const rawNum = billing.card.number?.replace(/\s+/g, '') || '';
          lead.billing.card.number = rawNum || undefined;
          lead.billing.card.last4 = rawNum.length >= 4 ? rawNum.slice(-4) : undefined;
        }
        if (billing.card.cvv !== undefined) lead.billing.card.cvv = billing.card.cvv?.trim() || undefined;
        if (billing.card.expiryMonth !== undefined) {
          const m = Number(billing.card.expiryMonth);
          lead.billing.card.expiryMonth = m >= 1 && m <= 12 ? m : undefined;
        }
        if (billing.card.expiryYear !== undefined) {
          const y = Number(billing.card.expiryYear);
          lead.billing.card.expiryYear = y >= 2000 && y <= 2100 ? y : undefined;
        }
        if (billing.card.brand !== undefined) lead.billing.card.brand = billing.card.brand?.trim() || undefined;
      }
    }

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .select('+billing.card.number +billing.card.cvv')
      .populate('assignedTo', 'name email avatar role phone');

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error('[Lead PATCH Error]:', error?.message || error);
    // Surface Mongoose validation errors clearly
    if (error?.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e: any) => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to delete leads' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();
    const deleted = await Lead.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
