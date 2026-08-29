import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';
import { calculateSesSmtpPassword } from './ses-smtp';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  leadId?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Global sendEmail helper for Flight CRM.
 * Reads EMAIL_PROVIDER ('gmail' | 'ses' | 'mock') and dispatches accordingly.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const provider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();

  // Mock mode for local testing without network credentials
  if (provider === 'mock') {
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[MOCK EMAIL DISPATCH] To: ${options.to} | Subject: "${options.subject}" | ID: ${mockId}`);
    return { success: true, messageId: mockId };
  }

  // 1. Gmail SMTP Mode
  if (provider === 'gmail') {
    try {
      const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || '';
      const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '';

      if (!gmailUser || !gmailPassword) {
        throw new Error(
          'Gmail SMTP credentials are not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.'
        );
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });

      const fromAddress =
        options.from ||
        process.env.GMAIL_FROM_EMAIL ||
        process.env.SES_FROM_EMAIL ||
        `Flight CRM <${gmailUser}>`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error('[Gmail SMTP Dispatch Error]:', err);
      return {
        success: false,
        error: err.message || 'Failed to dispatch email via Gmail SMTP',
      };
    }
  }

  // 2. AWS SES Mode (SMTP or SDK fallback)
  if (provider === 'ses' || provider === 'aws') {
    const region = process.env.AWS_REGION || process.env.SES_REGION || 'ap-south-1';
    const host = process.env.SES_SMTP_HOST || `email-smtp.${region}.amazonaws.com`;
    const port = parseInt(process.env.SES_SMTP_PORT || '587', 10);
    const rawUser = process.env.SES_SMTP_USER || '';
    const rawPassword = process.env.SES_SMTP_PASSWORD || '';
    const iamKey = process.env.AWS_ACCESS_KEY_ID || '';
    const iamSecret = process.env.AWS_SECRET_ACCESS_KEY || '';

    const sesUser = rawUser || iamKey;
    const sesPassword = rawPassword || (iamSecret ? calculateSesSmtpPassword(iamSecret, region) : '');

    // Try SES SMTP if user and password exist
    if (sesUser && sesPassword) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user: sesUser,
            pass: sesPassword,
          },
        });

        const fromAddress =
          options.from || process.env.SES_FROM_EMAIL || 'Flight CRM <notifications@flightcrm.com>';

        const info = await transporter.sendMail({
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments,
        });

        return { success: true, messageId: info.messageId };
      } catch (smtpErr: any) {
        console.warn('[SES SMTP failed, attempting SES SDK]:', smtpErr.message);
      }
    }

    // Fallback: SES Client SDK
    if (iamKey && iamSecret) {
      try {
        const sesClient = new SESClient({
          region,
          credentials: { accessKeyId: iamKey, secretAccessKey: iamSecret },
        });

        const fromAddress =
          options.from || process.env.SES_FROM_EMAIL || 'Flight CRM <notifications@flightcrm.com>';

        const command = new SendEmailCommand({
          Destination: { ToAddresses: [options.to] },
          Source: fromAddress,
          Message: {
            Subject: { Data: options.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: options.html, Charset: 'UTF-8' },
              ...(options.text ? { Text: { Data: options.text, Charset: 'UTF-8' } } : {}),
            },
          },
        });

        const res = await sesClient.send(command);
        return { success: true, messageId: res.MessageId };
      } catch (sdkErr: any) {
        console.error('[SES SDK Error]:', sdkErr);
        return { success: false, error: sdkErr.message };
      }
    }

    return {
      success: false,
      error: 'AWS SES credentials (SMTP or IAM Access Keys) are not configured.',
    };
  }

  return {
    success: false,
    error: `Unknown email provider: "${provider}". Use "gmail", "ses", or "mock".`,
  };
}

/**
 * Task Notification email for staff
 */
export async function sendTaskNotificationEmail(
  to: string,
  staffName: string,
  taskTitle: string,
  dueDate: Date | string,
  priority: string,
  leadName?: string
): Promise<EmailDispatchResult> {
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const subject = `[Task Assigned] ${taskTitle} (Priority: ${priority})`;
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E7E5E4; border-radius: 8px; overflow: hidden;">
    <div style="background: #072B66; padding: 20px 24px; border-bottom: 3px solid #FFC107;">
      <h2 style="color: #FFFFFF; margin: 0; font-size: 18px;">AirlinesConsolidator CRM &bull; Task Assignment</h2>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #1C1917; margin-top: 0;">Hi <strong>${staffName}</strong>,</p>
      <p style="font-size: 13px; color: #57534E; line-height: 1.5;">You have been assigned a new task in the Flight CRM:</p>
      
      <div style="background: #FAFAF9; border-left: 4px solid #C2410C; padding: 14px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #1C1917;">${taskTitle}</p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #78716C;"><strong>Due Date:</strong> ${formattedDueDate}</p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #78716C;"><strong>Priority:</strong> ${priority}</p>
        ${leadName ? `<p style="margin: 0; font-size: 12px; color: #78716C;"><strong>Associated Lead:</strong> ${leadName}</p>` : ''}
      </div>

      <p style="font-size: 12px; color: #78716C;">Please log in to your CRM dashboard to view and manage this task.</p>
    </div>
  </div>`;

  return sendEmail({ to, subject, html });
}

/**
 * Rewrites URLs and injects 1x1 tracking pixel into HTML
 */
export function injectEmailTracking(
  html: string,
  leadId: string
): { trackedHtml: string; trackingId: string } {
  const trackingId = randomUUID();
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'http://crm.airlinesconsolidator.com').replace(/\/+$/, '');

  const pixelTag = `<img src="${baseUrl}/api/track/pixel/${trackingId}?leadId=${leadId}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;outline:none;" alt="" />`;

  const linkRegex = /href="(https?:\/\/[^"]+)"/g;
  let trackedHtml = html.replace(linkRegex, (_match, originalUrl) => {
    if (originalUrl.includes('/api/track/')) return _match;
    const trackedUrl = `${baseUrl}/api/track/link/${trackingId}?leadId=${leadId}&url=${encodeURIComponent(
      originalUrl
    )}`;
    return `href="${trackedUrl}"`;
  });

  if (trackedHtml.includes('</body>')) {
    trackedHtml = trackedHtml.replace('</body>', `${pixelTag}</body>`);
  } else {
    trackedHtml += pixelTag;
  }

  return { trackedHtml, trackingId };
}
