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
    const lead = await Lead.findById(id).populate('assignedTo', 'name email avatar role phone');

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
    const lead = await Lead.findById(id).populate('assignedTo', 'name email');

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
      invoiceNumber,
      priceQuoted,
      currency,
      nextFollowUpDate,
      newNote,
      newComment,
      commentId,
      replyText,
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

    // 2b. Status and Booking Type transitions — logged like stage changes so the
    // lead timeline shows who moved it and when.
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

    // 4. Update basic fields
    if (name !== undefined) lead.name = name.trim();
    if (phone !== undefined) lead.phone = phone.trim();
    if (email !== undefined) lead.email = email.trim();
    if (source !== undefined) lead.source = source;
    if (origin !== undefined) lead.origin = origin.trim();
    if (destination !== undefined) lead.destination = destination.trim();
    if (travelDate !== undefined) lead.travelDate = travelDate ? new Date(travelDate) : undefined;
    if (returnDate !== undefined) lead.returnDate = returnDate ? new Date(returnDate) : undefined;
    if (pax !== undefined) lead.pax = Number(pax) || 1;
    if (tripType !== undefined) lead.tripType = tripType;
    if (paymentStatus !== undefined) lead.paymentStatus = paymentStatus;
    if (pnr !== undefined) lead.pnr = pnr.trim();
    if (invoiceNumber !== undefined) lead.invoiceNumber = invoiceNumber.trim();
    if (priceQuoted !== undefined) lead.priceQuoted = Number(priceQuoted) || 0;
    if (currency !== undefined) lead.currency = currency;
    if (nextFollowUpDate !== undefined) {
      lead.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : undefined;
    }

    await lead.save();

    const updatedLead = await Lead.findById(lead._id).populate(
      'assignedTo',
      'name email avatar role phone'
    );

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
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
