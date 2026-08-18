import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { getAuthUser } from '@/lib/auth';
import { sendEmail, injectEmailTracking } from '@/lib/email';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Recipient email, subject, and message HTML are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (user.role === 'staff' && lead.assignedTo?.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Inject tracking pixel & link click rewrite
    const { trackedHtml, trackingId } = injectEmailTracking(html, lead._id.toString());

    // 2. Dispatch email
    const result = await sendEmail({
      to,
      subject,
      html: trackedHtml,
      leadId: lead._id.toString(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to dispatch email' }, { status: 500 });
    }

    // 3. Log event into lead timeline
    lead.activityLog.push({
      id: `act_mail_${Date.now()}`,
      type: 'email_sent',
      description: `Email sent to ${to} ("${subject}") by ${user.name}`,
      actorName: user.name,
      timestamp: new Date(),
      meta: { trackingId, subject, to },
    });

    // Advance stage to Contacted if still New
    if (lead.stage === 'New') {
      lead.stage = 'Contacted';
    }

    await lead.save();

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      trackingId,
      message: 'Email dispatched successfully with active tracking pixel & click tracking!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
