import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  leadId?: string;
}

/**
 * Injects 1x1 tracking pixel and wraps <a> links with tracking redirect URLs
 */
export function injectEmailTracking(
  html: string,
  leadId: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
): { trackedHtml: string; trackingId: string } {
  const trackingId = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Rewrite <a href="..."> links (excluding mailto: and javascript:)
  const trackedLinksHtml = html.replace(
    /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi,
    (match, quote, url) => {
      if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#') || url.startsWith('javascript:')) {
        return match;
      }
      const trackingUrl = `${baseUrl}/api/track/link/${trackingId}?leadId=${leadId}&url=${encodeURIComponent(url)}`;
      return match.replace(url, trackingUrl);
    }
  );

  // 2. Append 1x1 tracking pixel before </body> or at the end
  const pixelHtml = `<img src="${baseUrl}/api/track/pixel/${trackingId}?leadId=${leadId}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;outline:none;" alt="" />`;

  let finalHtml = trackedLinksHtml;
  if (finalHtml.includes('</body>')) {
    finalHtml = finalHtml.replace('</body>', `${pixelHtml}</body>`);
  } else {
    finalHtml += pixelHtml;
  }

  return { trackedHtml: finalHtml, trackingId };
}

/**
 * Dispatches email via configured provider: AWS SES, Gmail SMTP, or mock logger
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  const defaultFrom = process.env.GMAIL_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'Flight CRM <notifications@flightcrm.com>';
  const fromAddress = options.from || defaultFrom;

  console.log(`[Email Dispatch] Provider: ${provider} | To: ${options.to} | Subject: ${options.subject}`);

  try {
    // 1. AWS SES Provider
    if (provider === 'ses') {
      const sesKey = process.env.SES_KEY;
      const sesSecret = process.env.SES_SECRET;
      const sesRegion = process.env.SES_REGION || 'us-east-1';

      if (!sesKey || !sesSecret) {
        throw new Error('AWS SES credentials (SES_KEY, SES_SECRET) are missing.');
      }

      const sesClient = new SESClient({
        region: sesRegion,
        credentials: {
          accessKeyId: sesKey,
          secretAccessKey: sesSecret,
        },
      });

      const command = new SendEmailCommand({
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Body: {
            Html: { Charset: 'UTF-8', Data: options.html },
            Text: options.text ? { Charset: 'UTF-8', Data: options.text } : undefined,
          },
          Subject: { Charset: 'UTF-8', Data: options.subject },
        },
        Source: fromAddress,
      });

      const response = await sesClient.send(command);
      return { success: true, messageId: response.MessageId };
    }

    // 2. Gmail SMTP Provider
    if (provider === 'gmail') {
      const user = process.env.GMAIL_USER;
      const pass = process.env.GMAIL_APP_PASSWORD;

      if (!user || !pass) {
        throw new Error('Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are missing.');
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return { success: true, messageId: info.messageId };
    }

    // 3. Mock Provider (Development / Fallback)
    console.log('--- [MOCK EMAIL SENT] ---');
    console.log(`From: ${fromAddress}`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`HTML Body Length: ${options.html.length} chars`);
    console.log('-------------------------');

    return { success: true, messageId: `mock_${Date.now()}` };
  } catch (error: any) {
    console.error('[Email Error]:', error.message || error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Sends a task assignment notification email
 */
export async function sendTaskNotificationEmail(
  staffEmail: string,
  staffName: string,
  taskTitle: string,
  taskDueDate: Date,
  priority: string,
  leadName?: string
): Promise<void> {
  const subject = `[Task Assigned] ${taskTitle} (Priority: ${priority})`;
  const dueDateStr = new Date(taskDueDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const html = `
    <div style="font-family: 'Source Sans 3', sans-serif, Arial; max-width: 600px; margin: 0 auto; background: #FAFAF9; padding: 24px; border: 1px solid #D6D3D1; border-radius: 12px;">
      <div style="border-bottom: 2px solid #C2410C; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #C2410C; margin: 0; font-size: 22px; font-family: 'Playfair Display', Georgia, serif;">Flight CRM &bull; Task Notification</h2>
      </div>
      <p style="color: #1C1917; font-size: 16px;">Hello <strong>${staffName}</strong>,</p>
      <p style="color: #57534E; font-size: 15px;">A new task has been assigned to you:</p>
      
      <div style="background: #F5F5F4; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 8px 0; color: #1C1917; font-size: 17px;">${taskTitle}</h3>
        <p style="margin: 4px 0; color: #57534E; font-size: 14px;"><strong>Due Date:</strong> ${dueDateStr}</p>
        <p style="margin: 4px 0; color: #57534E; font-size: 14px;"><strong>Priority:</strong> <span style="background: #E7E5E4; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">${priority}</span></p>
        ${leadName ? `<p style="margin: 4px 0; color: #57534E; font-size: 14px;"><strong>Associated Lead:</strong> ${leadName}</p>` : ''}
      </div>

      <p style="color: #78716C; font-size: 13px; margin-top: 24px;">Please log in to your CRM dashboard to view details and mark progress.</p>
    </div>
  `;

  await sendEmail({
    to: staffEmail,
    subject,
    html,
    text: `Hello ${staffName}, a new task has been assigned: ${taskTitle}. Due: ${dueDateStr}. Priority: ${priority}.`,
  });
}
