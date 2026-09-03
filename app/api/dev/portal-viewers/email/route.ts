import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

/**
 * POST /api/dev/portal-viewers/email
 * Dev-only bulk / individual email sender.
 *
 * Body:
 * {
 *   leadIds:      string[];        // one or many lead IDs
 *   subject:      string;          // supports {{name}} {{ref}} {{route}} {{status}} tokens
 *   html:         string;          // fallback body; overridden per-lead by templateMap
 *   from?:        string;          // sender address
 *   provider?:    string;          // 'godaddy'|'gmail'|'ses'|'mock' — overrides EMAIL_PROVIDER
 *   templateMap?: Record<id,html>; // per-lead HTML (individual / bulk CS template mode)
 *   recipients?:  string[];        // explicit TO addresses — ALL lead templates are sent
 *                                  // to these addresses instead of each lead's own email.
 *                                  // Used by the bulk CS-notification flow where a CS agent
 *                                  // is the recipient, not the customer.
 * }
 *
 * Behaviour:
 *   • If `recipients` is provided and non-empty:
 *       For every lead, send its personalised template to EVERY address in recipients.
 *       The lead's own email is NOT used.
 *   • Otherwise (individual send / original behaviour):
 *       Send each lead's template to that lead's own email address.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      leadIds,
      subject,
      html,
      from,
      provider,
      templateMap = {},
      recipients,
    } = body as {
      leadIds: string[];
      subject: string;
      html: string;
      from?: string;
      provider?: string;
      templateMap?: Record<string, string>;
      recipients?: string[];
    };

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds must be a non-empty array' }, { status: 400 });
    }
    if (!subject?.trim()) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }
    if (!html?.trim() && Object.keys(templateMap).length === 0) {
      return NextResponse.json({ error: 'html body or templateMap is required' }, { status: 400 });
    }

    // Validate and clean explicit recipients if provided
    const explicitRecipients: string[] =
      Array.isArray(recipients)
        ? recipients.map((r) => r.trim()).filter((r) => r.includes('@'))
        : [];

    if (explicitRecipients.length === 0 && Array.isArray(recipients) && recipients.length > 0) {
      return NextResponse.json({ error: 'recipients array contains no valid email addresses' }, { status: 400 });
    }

    const validIds = leadIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid lead IDs provided' }, { status: 400 });
    }

    // Override EMAIL_PROVIDER for this request if caller specified one
    const originalProvider = process.env.EMAIL_PROVIDER;
    if (provider) process.env.EMAIL_PROVIDER = provider;

    await connectToDatabase();

    const leads = await Lead.find({ _id: { $in: validIds } })
      .select('name email paymentStatus referenceNumber invoiceNumber origin destination customerPortal.trackingToken')
      .lean();

    const results: Array<{
      leadId: string;
      name: string;
      sentTo: string[];
      success: boolean;
      messageIds?: string[];
      error?: string;
      skipped?: boolean;
      skipReason?: string;
    }> = [];

    for (const lead of leads as any[]) {
      const ref   = lead.referenceNumber || lead.invoiceNumber || '—';
      const route = lead.origin && lead.destination
        ? `${lead.origin} → ${lead.destination}`
        : lead.origin || lead.destination || '—';
      const isAuthorized = lead.paymentStatus === 'Authorized' || lead.paymentStatus === 'Paid';
      const statusLabel  = isAuthorized ? '✅ Authorized' : '👀 Viewed';

      // Decide TO addresses for this lead
      const toAddresses: string[] =
        explicitRecipients.length > 0
          ? explicitRecipients                    // bulk-to-CS mode
          : lead.email ? [lead.email] : [];       // individual-to-customer mode

      if (toAddresses.length === 0) {
        results.push({
          leadId: lead._id.toString(),
          name:   lead.name || '—',
          sentTo: [],
          success:    false,
          skipped:    true,
          skipReason: explicitRecipients.length > 0
            ? 'No valid recipient addresses provided'
            : 'No email address on record for this lead',
        });
        continue;
      }

      const rawHtml = templateMap[lead._id.toString()] || html;

      const personalised = rawHtml
        .replace(/\{\{name\}\}/gi,   lead.name || 'Valued Customer')
        .replace(/\{\{ref\}\}/gi,    ref)
        .replace(/\{\{route\}\}/gi,  route)
        .replace(/\{\{email\}\}/gi,  lead.email || '—')
        .replace(/\{\{status\}\}/gi, statusLabel);

      const finalSubject = subject
        .replace(/\{\{name\}\}/gi,   lead.name || 'Valued Customer')
        .replace(/\{\{ref\}\}/gi,    ref)
        .replace(/\{\{route\}\}/gi,  route)
        .replace(/\{\{status\}\}/gi, statusLabel);

      // Send to every TO address (usually 1, but supports multi-recipient)
      const sendResults = await Promise.all(
        toAddresses.map((to) =>
          sendEmail({ to, subject: finalSubject, html: personalised, ...(from ? { from } : {}), leadId: lead._id.toString() })
        )
      );

      const allOk     = sendResults.every((r) => r.success);
      const firstFail = sendResults.find((r) => !r.success);
      const msgIds    = sendResults.map((r) => r.messageId).filter(Boolean) as string[];

      results.push({
        leadId: lead._id.toString(),
        name:   lead.name || '—',
        sentTo: toAddresses,
        success:    allOk,
        messageIds: msgIds,
        error:      firstFail?.error,
      });

      // Activity log — fire-and-forget
      try {
        await Lead.findByIdAndUpdate(lead._id, {
          $push: {
            activityLog: {
              id: `act_dev_bulk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'email_sent',
              description: `[Dev] CS notification sent to [${toAddresses.join(', ')}] via ${provider || originalProvider || 'default'} — "${finalSubject}"`,
              actorName: 'Dev Tools',
              timestamp: new Date(),
              meta: { subject: finalSubject, provider: provider || originalProvider, from, recipients: toAddresses },
            },
          },
        });
      } catch (_) { /* non-critical */ }
    }

    // Restore original provider
    if (provider && originalProvider !== undefined) {
      process.env.EMAIL_PROVIDER = originalProvider;
    }

    return NextResponse.json({
      results,
      summary: {
        total:   results.length,
        success: results.filter((r) => r.success).length,
        failed:  results.filter((r) => !r.success && !r.skipped).length,
        skipped: results.filter((r) => r.skipped).length,
      },
    });
  } catch (err: any) {
    console.error('[Dev Portal Viewers Email POST]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
