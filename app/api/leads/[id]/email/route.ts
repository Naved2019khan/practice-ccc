import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { getAuthUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { generateTrackingToken, buildCustomerEmailHtml } from '@/lib/tracking';
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

    const body = await req.json();
    const {
      to,
      subject,
      customMessage,
      useDefaultBrandedTemplate = true,
      customHtml,
      selectedAttachmentIds = [],
    } = body;

    await connectToDatabase();
    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const recipientEmail = to || lead.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Passenger does not have a recipient email address.' },
        { status: 400 }
      );
    }

    // 1. Generate or maintain secure tracking token (Never expose Lead MongoDB ID in tracking URLs!)
    if (!lead.customerPortal) {
      lead.customerPortal = {
        trackingToken: generateTrackingToken(),
        viewCount: 0,
        downloadCount: 0,
        history: [],
      };
    } else if (!lead.customerPortal.trackingToken) {
      lead.customerPortal.trackingToken = generateTrackingToken();
    }

    const trackingToken = lead.customerPortal.trackingToken;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 2. Select attachments to include
    const allAttachments = lead.attachments || [];
    const attachmentsToInclude =
      selectedAttachmentIds.length > 0
        ? allAttachments.filter((a: any) => selectedAttachmentIds.includes(a.id))
        : allAttachments;

    // 3. Build HTML content
    let finalHtml = '';
    let emailSubject = subject;

    if (useDefaultBrandedTemplate || !customHtml) {
      const emailBuild = buildCustomerEmailHtml({
        lead,
        trackingToken,
        customMessage,
        baseUrl,
        agentName: user.name,
        agentEmail: user.email,
        attachedFiles: attachmentsToInclude,
      });
      finalHtml = emailBuild.html;
      if (!emailSubject) {
        emailSubject = `Flight Itinerary & Booking Details &bull; ${lead.origin} &rarr; ${lead.destination} (Ref: ${lead.pnr || lead.invoiceNumber || 'PENDING'})`;
      }
    } else {
      finalHtml = customHtml;
    }

    // 4. Dispatch email with attachments
    const result = await sendEmail({
      to: recipientEmail,
      subject: emailSubject || `Flight Itinerary for ${lead.name}`,
      html: finalHtml,
      leadId: lead._id.toString(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to dispatch email' },
        { status: 500 }
      );
    }

    // 5. Update Customer Portal tracking state
    const now = new Date();
    lead.customerPortal.lastSentAt = now;
    lead.customerPortal.lastSentTo = recipientEmail;
    lead.customerPortal.lastSentSubject = emailSubject;
    lead.customerPortal.lastSentBy = user.name;

    const eventId = `portal_ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    lead.customerPortal.history.push({
      id: eventId,
      event: 'email_sent',
      description: `E-Ticket & Itinerary email dispatched to ${recipientEmail} by ${user.name}`,
      meta: {
        subject: emailSubject,
        attachmentsCount: attachmentsToInclude.length,
        trackingToken,
      },
      timestamp: now,
    });

    // 6. Log in main timeline
    lead.activityLog.push({
      id: `act_mail_${Date.now()}`,
      type: 'email_sent',
      description: `Customer email sent to ${recipientEmail} ("${emailSubject}") with ${attachmentsToInclude.length} ticket attachments by ${user.name}`,
      actorName: user.name,
      timestamp: now,
      meta: {
        trackingToken,
        subject: emailSubject,
        to: recipientEmail,
        attachmentsCount: attachmentsToInclude.length,
      },
    });

    // Advance stage to Contacted if New
    if (lead.stage === 'New') {
      lead.stage = 'Contacted';
    }

    await lead.save();

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      trackingToken,
      trackingUrl: `${baseUrl.replace(/\/+$/, '')}/portal/${trackingToken}`,
      message: 'Email with tickets and tracking link dispatched successfully!',
      lead,
    });
  } catch (error: any) {
    console.error('[Lead Email Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
