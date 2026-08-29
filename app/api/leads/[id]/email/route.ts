import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { EmailTemplate } from '@/models/EmailTemplate';
import { getAuthUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { generateTrackingToken, buildCustomerEmailHtml } from '@/lib/tracking';
import { buildTemplateVariables, substituteTemplateVariables } from '@/lib/templateUtils';
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
      templateId,
      templateOverrides = {},
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

    const rawCustomHtml = customHtml || body.html;

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

    const trackingToken: string = lead.customerPortal.trackingToken || generateTrackingToken();
    lead.customerPortal.trackingToken = trackingToken;

    // Detect base URL from request host or env
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
    const proto = req.headers.get('x-forwarded-proto') || (isLocalhost ? 'http' : 'http');
    const defaultLiveUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost'))
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'http://crm.airlinesconsolidator.com';
    const detectedBaseUrl = (host && !isLocalhost) ? `${proto}://${host}` : defaultLiveUrl;
    const baseUrl = detectedBaseUrl.replace(/\/+$/, '');

    // 2. Select attachments to include
    const allAttachments = lead.attachments || [];
    const attachmentsToInclude =
      selectedAttachmentIds.length > 0
        ? allAttachments.filter((a: any) => selectedAttachmentIds.includes(a.id))
        : allAttachments;

    // 3. Build HTML content
    let finalHtml = '';
    let emailSubject = subject;

    const portalUrl = `${baseUrl}/portal/${trackingToken}`;
    const authUrl = `${baseUrl}/api/portal/${trackingToken}/authorize`;

    if (templateId) {
      // --- Stored template with variable substitution ---
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 });
      }
      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const vars = buildTemplateVariables(
        lead,
        user.name,
        user.email,
        user.phone,
        undefined,
        undefined,
        portalUrl,
        undefined,
        authUrl
      );

      // Allow the caller to override specific variables (e.g. flight details)
      const mergedVars = { ...vars, ...templateOverrides };

      finalHtml = substituteTemplateVariables(template.bodyHtml, mergedVars);
      emailSubject = subject || substituteTemplateVariables(template.subject, mergedVars);
    } else if (useDefaultBrandedTemplate || !rawCustomHtml) {
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
        emailSubject = `Flight Itinerary & Booking Details • ${lead.origin} → ${lead.destination} (Ref: ${lead.pnr || lead.invoiceNumber || 'PENDING'})`;
      }
    } else {
      finalHtml = rawCustomHtml;
      // Safeguard: replace any template variables or placeholder links in rawCustomHtml
      const vars = buildTemplateVariables(
        lead,
        user.name,
        user.email,
        user.phone,
        undefined,
        undefined,
        portalUrl,
        undefined,
        authUrl
      );
      finalHtml = substituteTemplateVariables(finalHtml, vars);

      // Replace any href="#" or placeholder link targets for portal or authorization
      finalHtml = finalHtml
        .replace(/href=["']#["']/g, `href="${portalUrl}"`)
        .replace(/href=["'](?:https?:\/\/[^"']*)?\/portal\/[^"']*["']/g, `href="${portalUrl}"`)
        .replace(/href=["'](?:https?:\/\/[^"']*)?\/api\/portal\/[^"']*\/authorize["']/g, `href="${authUrl}"`);
    }

    // Always attach tracking pixel for open rate tracking
    const pixelUrl = `${baseUrl}/api/track/pixel/${trackingToken}?token=${trackingToken}`;
    const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;outline:none;" alt="" />`;
    if (!finalHtml.includes('/api/track/pixel/')) {
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${pixelTag}</body>`);
      } else {
        finalHtml += pixelTag;
      }
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

    // 5. Update Customer Portal tracking state and persist to MongoDB
    const now = new Date();
    const eventId = `portal_ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const existingHistory = Array.isArray(lead.customerPortal?.history)
      ? lead.customerPortal.history
      : [];

    const newHistoryEvent = {
      id: eventId,
      event: 'email_sent' as const,
      description: `E-Ticket & Itinerary email dispatched to ${recipientEmail} by ${user.name}`,
      meta: {
        subject: emailSubject,
        attachmentsCount: attachmentsToInclude.length,
        trackingToken,
      },
      timestamp: now,
    };

    const portalPayload = {
      trackingToken,
      lastSentAt: now,
      lastSentTo: recipientEmail,
      lastSentSubject: emailSubject,
      lastSentBy: user.name,
      lastViewedAt: lead.customerPortal?.lastViewedAt,
      lastViewedIp: lead.customerPortal?.lastViewedIp,
      lastViewedDevice: lead.customerPortal?.lastViewedDevice,
      viewCount: lead.customerPortal?.viewCount || 0,
      downloadCount: lead.customerPortal?.downloadCount || 0,
      history: [...existingHistory, newHistoryEvent],
    };

    const activityItem = {
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
    };

    const newStage = lead.stage === 'New' ? 'Contacted' : lead.stage;

    // Direct findByIdAndUpdate guarantees MongoDB writes the trackingToken and history
    const updatedLead = await Lead.findByIdAndUpdate(
      lead._id,
      {
        $set: {
          customerPortal: portalPayload,
          stage: newStage,
        },
        $push: {
          activityLog: activityItem,
        },
      },
      { new: true }
    ).populate('assignedTo', 'name email avatar role phone');

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      trackingToken,
      trackingUrl: `${baseUrl}/portal/${trackingToken}`,
      message: 'Email with tickets and tracking link dispatched successfully!',
      lead: updatedLead || lead,
    });
  } catch (error: any) {
    console.error('[Lead Email Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
