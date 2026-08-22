import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { getNextRoundRobinStaff } from '@/lib/assignment';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      origin,
      destination,
      travelDate,
      returnDate,
      pax = 1,
      tripType = 'Round Trip',
      message,
    } = body;

    if (!name || !phone || !origin || !destination) {
      return NextResponse.json(
        { error: 'Name, phone number, origin, and destination are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Auto-assign to next active staff member
    const roundRobin = await getNextRoundRobinStaff();
    const assignDesc = roundRobin.autoAssigned && roundRobin.assignedStaffName
      ? `Auto-assigned to ${roundRobin.assignedStaffName}`
      : 'Unassigned';

    const notes = [];
    if (message && message.trim()) {
      notes.push({
        id: `note_${Date.now()}`,
        text: `Customer Inquiry Message: "${message.trim()}"`,
        authorName: 'Public Web Form',
        authorRole: 'system',
        createdAt: new Date(),
      });
    }

    const activityLog = [
      {
        id: `act_${Date.now()}`,
        type: 'contact_form_submission',
        description: `New quote inquiry submitted via public Contact Us page (${assignDesc})`,
        actorName: 'Website Visitor',
        timestamp: new Date(),
      },
    ];

    const newLead = await Lead.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      source: 'Contact Us',
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate: travelDate ? new Date(travelDate) : undefined,
      returnDate: returnDate ? new Date(returnDate) : undefined,
      pax: Number(pax) || 1,
      tripType,
      stage: 'New',
      assignedTo: roundRobin.assignedTo,
      paymentStatus: 'Pending',
      notes,
      activityLog,
      nextFollowUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24h
    });

    return NextResponse.json({
      success: true,
      message: 'Inquiry received successfully! Our travel specialist will contact you shortly.',
      leadId: newLead._id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
