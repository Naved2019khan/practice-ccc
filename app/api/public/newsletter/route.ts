import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Newsletter } from '@/models/Newsletter';
import { Lead } from '@/models/Lead';
import { getNextRoundRobinStaff } from '@/lib/assignment';

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    await Newsletter.findOneAndUpdate(
      { email: normalizedEmail },
      { source: 'Website Newsletter Form', status: 'Active' },
      { upsert: true, new: true }
    );

    // Also create or record a lead with source "Newsletter"
    const roundRobin = await getNextRoundRobinStaff();
    await Lead.create({
      name: name?.trim() || `Subscriber (${normalizedEmail.split('@')[0]})`,
      phone: `+1-NL-${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: normalizedEmail,
      source: 'Newsletter',
      origin: 'Pending Inquiry',
      destination: 'Pending Inquiry',
      stage: 'New',
      assignedTo: roundRobin.assignedTo,
      paymentStatus: 'Pending',
      activityLog: [
        {
          id: `act_${Date.now()}`,
          type: 'newsletter_signup',
          description: `Subscribed to newsletter and added to potential leads (${
            roundRobin.assignedStaffName ? `Auto-assigned to ${roundRobin.assignedStaffName}` : 'Unassigned'
          })`,
          actorName: 'Website Subscriber',
          timestamp: new Date(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing to flight deals and fare alerts!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
