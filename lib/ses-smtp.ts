import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface SmtpConfigInfo {
  host: string;
  port: number;
  user: string;
  hasPassword: boolean;
  region: string;
  isConfigured: boolean;
  missingFields: string[];
  isUserPortalId: boolean;
  hasIamCredentials: boolean;
  activeProvider: string;
  gmailUser: string;
  isGmailConfigured: boolean;
}

export interface GodaddyConfigInfo {
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  hasPassword: boolean;
  isConfigured: boolean;
  maskedUser: string;
}

/**
 * Calculates AWS SES SMTP password from an IAM Secret Access Key (SigV4)
 */
export function calculateSesSmtpPassword(secretAccessKey: string, region = 'ap-south-1'): string {
  const DATE = '11111111';
  const SERVICE = 'ses';
  const MESSAGE = 'SendRawEmail';
  const TERMINAL = 'aws4_request';
  const VERSION = Buffer.from([0x04]);

  const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(DATE).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(SERVICE).digest();
  const kSigning = crypto.createHmac('sha256', kService).update(TERMINAL).digest();
  const signature = crypto.createHmac('sha256', kSigning).update(MESSAGE).digest();

  const signatureAndVersion = Buffer.concat([VERSION, signature]);
  return signatureAndVersion.toString('base64');
}

export function getSmtpConfig(): SmtpConfigInfo {
  const activeProvider = process.env.EMAIL_PROVIDER || 'gmail';
  const region = process.env.AWS_REGION || process.env.SES_REGION || 'ap-south-1';
  const defaultHost = region ? `email-smtp.${region}.amazonaws.com` : 'email-smtp.ap-south-1.amazonaws.com';
  const host = process.env.SES_SMTP_HOST || defaultHost;
  const port = parseInt(process.env.SES_SMTP_PORT || '587', 10);
  const rawUser = process.env.SES_SMTP_USER || '';
  const rawPassword = process.env.SES_SMTP_PASSWORD || '';
  const iamKey = process.env.AWS_ACCESS_KEY_ID || process.env.SES_KEY || '';
  const iamSecret = process.env.AWS_SECRET_ACCESS_KEY || process.env.SES_SECRET || '';

  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || '';
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '';
  const isGmailConfigured = Boolean(gmailUser && gmailPass);

  const isUserPortalId = rawUser.startsWith('inp-') || (rawUser.length > 0 && !rawUser.startsWith('AKIA') && !rawUser.includes('@'));

  const user = rawUser || iamKey;
  const password = rawPassword || (iamSecret ? calculateSesSmtpPassword(iamSecret, region) : '');

  const missingFields: string[] = [];
  if (!host) missingFields.push('SES_SMTP_HOST');
  if (!user) missingFields.push('SES_SMTP_USER');
  if (!password) missingFields.push('SES_SMTP_PASSWORD');

  return {
    host,
    port,
    user,
    hasPassword: Boolean(password),
    region,
    isConfigured: Boolean(host && user && password),
    missingFields,
    isUserPortalId,
    hasIamCredentials: Boolean(iamKey && iamSecret),
    activeProvider,
    gmailUser,
    isGmailConfigured,
  };
}

export function getGodaddyConfig(): GodaddyConfigInfo {
  const user = process.env.GODADDY_SMTP_USER || process.env.GODADDY_EMAIL || '';
  const password = process.env.GODADDY_SMTP_PASSWORD || '';
  const host = process.env.GODADDY_SMTP_HOST || 'smtpout.secureserver.net';
  const port = parseInt(process.env.GODADDY_SMTP_PORT || '465', 10);
  const fromEmail =
    process.env.GODADDY_FROM_EMAIL ||
    user ||
    'support@airlinesconsolidator.com';

  const maskedUser =
    user.length > 8
      ? `${user.substring(0, 3)}...${user.substring(user.indexOf('@') > -1 ? user.indexOf('@') : user.length - 4)}`
      : user
      ? '***'
      : 'Not configured';

  return {
    host,
    port,
    user,
    fromEmail,
    hasPassword: Boolean(password),
    isConfigured: Boolean(user && password),
    maskedUser,
  };
}

export function createGodaddyTransporter() {
  const cfg = getGodaddyConfig();
  const password = process.env.GODADDY_SMTP_PASSWORD || '';

  if (!cfg.user || !password) {
    throw new Error(
      'GoDaddy SMTP credentials (GODADDY_SMTP_USER, GODADDY_SMTP_PASSWORD) are missing from .env.'
    );
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export function createGmailTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || '';
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '';

  if (!user || !pass) {
    throw new Error('Gmail credentials (GMAIL_USER, GMAIL_APP_PASSWORD or SMTP_USER, SMTP_PASSWORD) are missing.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export function createSmtpTransporter(useDerivedIam = false) {
  const config = getSmtpConfig();
  const region = config.region;
  const iamKey = process.env.AWS_ACCESS_KEY_ID || process.env.SES_KEY || '';
  const iamSecret = process.env.AWS_SECRET_ACCESS_KEY || process.env.SES_SECRET || '';

  let user = config.user;
  let pass = process.env.SES_SMTP_PASSWORD || '';

  if (useDerivedIam && iamKey && iamSecret) {
    user = iamKey;
    pass = calculateSesSmtpPassword(iamSecret, region);
  } else if (!pass && iamSecret) {
    pass = calculateSesSmtpPassword(iamSecret, region);
  }

  if (!config.host || !user || !pass) {
    throw new Error(
      `SES SMTP is not configured. Missing required variables: ${config.missingFields.join(', ')}`
    );
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function testSmtpConnection(options?: { provider?: 'gmail' | 'smtp' | 'ses_api' | 'godaddy'; useDerivedIam?: boolean }): Promise<{
  success: boolean;
  message: string;
  details: {
    host: string;
    port?: number;
    region?: string;
    provider: string;
    authConfigured: boolean;
    maskedUser: string;
    latencyMs?: number;
    isPortalIdWarning?: boolean;
  };
  error?: string;
  troubleshooting?: string[];
}> {
  const provider = options?.provider || (process.env.EMAIL_PROVIDER === 'gmail' ? 'gmail' : process.env.EMAIL_PROVIDER === 'godaddy' ? 'godaddy' : 'smtp');
  const config = getSmtpConfig();
  const startTime = Date.now();

  // Test Gmail SMTP
  if (provider === 'gmail') {
    const user = config.gmailUser;
    const maskedUser = user
      ? user.length > 8
        ? `${user.substring(0, 3)}...${user.substring(user.indexOf('@'))}`
        : '***'
      : 'Not configured';

    if (!config.isGmailConfigured) {
      return {
        success: false,
        message: 'Gmail SMTP credentials missing from .env.',
        details: {
          host: 'smtp.gmail.com',
          port: 465,
          provider: 'Gmail SMTP',
          authConfigured: false,
          maskedUser,
        },
        error: 'Please set GMAIL_USER (or SMTP_USER) and GMAIL_APP_PASSWORD (or SMTP_PASSWORD) in .env.',
        troubleshooting: [
          'Generate a 16-character Google App Password under Google Account -> Security -> 2-Step Verification -> App Passwords.',
          'Set GMAIL_USER=yourname@gmail.com and GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx in .env.',
        ],
      };
    }

    try {
      const transporter = createGmailTransporter();
      await transporter.verify();
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        message: 'Gmail SMTP handshake and authentication verified successfully!',
        details: {
          host: 'smtp.gmail.com',
          port: 465,
          provider: 'Gmail SMTP',
          authConfigured: true,
          maskedUser,
          latencyMs,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        message: 'Failed to verify Gmail SMTP connection.',
        details: {
          host: 'smtp.gmail.com',
          port: 465,
          provider: 'Gmail SMTP',
          authConfigured: true,
          maskedUser,
          latencyMs,
        },
        error: err.message || 'Gmail authentication failed',
        troubleshooting: [
          'Make sure you are using a Google App Password (not your regular account password).',
          'Ensure 2-Step Verification is enabled on your Google Account.',
        ],
      };
    }
  }

  // Test GoDaddy SMTP
  if (provider === 'godaddy') {
    const gdConfig = getGodaddyConfig();
    if (!gdConfig.isConfigured) {
      return {
        success: false,
        message: 'GoDaddy SMTP credentials missing from .env.',
        details: {
          host: gdConfig.host,
          port: gdConfig.port,
          provider: 'GoDaddy SMTP',
          authConfigured: false,
          maskedUser: gdConfig.maskedUser,
        },
        error: 'Please set GODADDY_SMTP_USER and GODADDY_SMTP_PASSWORD in .env.',
        troubleshooting: [
          'In your GoDaddy Workspace Email panel, go to Email Accounts → the account you want → Settings.',
          'SMTP host is smtpout.secureserver.net, port 465 (SSL) or 587 (STARTTLS).',
          'Username = your full GoDaddy email address (e.g. support@airlinesconsolidator.com).',
          'Password = your Workspace Email account password.',
        ],
      };
    }

    try {
      const transporter = createGodaddyTransporter();
      await transporter.verify();
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: 'GoDaddy SMTP handshake and authentication verified successfully!',
        details: {
          host: gdConfig.host,
          port: gdConfig.port,
          provider: 'GoDaddy SMTP',
          authConfigured: true,
          maskedUser: gdConfig.maskedUser,
          latencyMs,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        message: 'GoDaddy SMTP connection failed.',
        details: {
          host: gdConfig.host,
          port: gdConfig.port,
          provider: 'GoDaddy SMTP',
          authConfigured: true,
          maskedUser: gdConfig.maskedUser,
          latencyMs,
        },
        error: err.message || 'GoDaddy authentication failed',
        troubleshooting: [
          'Double-check your Workspace Email password — GoDaddy does not use App Passwords.',
          'Make sure the account exists and is active in your GoDaddy Workspace Email panel.',
          'Try port 587 (STARTTLS) by setting GODADDY_SMTP_PORT=587 if 465 is blocked.',
          'Contact GoDaddy support if SMTP access is disabled on your hosting plan.',
        ],
      };
    }
  }

  // Test AWS SES SMTP
  const maskedUser = config.user
    ? config.user.length > 8
      ? `${config.user.substring(0, 4)}...${config.user.substring(config.user.length - 4)}`
      : '***'
    : 'Not configured';

  if (!config.isConfigured) {
    return {
      success: false,
      message: 'AWS SES SMTP credentials missing from environment.',
      details: {
        host: config.host,
        port: config.port,
        region: config.region,
        provider: 'AWS SES SMTP',
        authConfigured: false,
        maskedUser,
      },
      error: `Missing environment variables: ${config.missingFields.join(', ')}`,
      troubleshooting: [
        'Ensure SES_SMTP_HOST, SES_SMTP_USER, and SES_SMTP_PASSWORD are defined in your .env file.',
        'Generate SES SMTP credentials in AWS Console -> Amazon SES -> SMTP settings -> "Create SMTP credentials".',
      ],
    };
  }

  try {
    const transporter = createSmtpTransporter(options?.useDerivedIam);
    await transporter.verify();
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      message: 'AWS SES SMTP handshake and authentication verified successfully.',
      details: {
        host: config.host,
        port: config.port,
        region: config.region,
        provider: 'AWS SES SMTP',
        authConfigured: true,
        maskedUser,
        latencyMs,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err.message || 'SMTP Connection failed';

    const troubleshooting: string[] = [];
    if (
      errorMessage.includes('Invalid login') ||
      errorMessage.includes('535') ||
      errorMessage.includes('Authentication')
    ) {
      if (config.isUserPortalId) {
        troubleshooting.push(
          `Detected AWS Portal / SSO identifier ("${config.user}"). AWS SES SMTP requires dedicated SMTP credentials created in the SES console.`
        );
      }
      troubleshooting.push(
        'Go to AWS Console -> Amazon SES -> SMTP settings -> Click "Create SMTP credentials" to generate the official SMTP Username & Password.'
      );
      troubleshooting.push(
        'Or switch the sending method to "Gmail SMTP" or "AWS SES API (SDK)" to send immediately without SMTP setup.'
      );
    } else {
      troubleshooting.push(`Verify AWS SES region matches the SES SMTP host (${config.host}).`);
    }

    return {
      success: false,
      message: 'Failed to verify SMTP connection.',
      details: {
        host: config.host,
        port: config.port,
        region: config.region,
        provider: 'AWS SES SMTP',
        authConfigured: true,
        maskedUser,
        latencyMs,
        isPortalIdWarning: config.isUserPortalId,
      },
      error: errorMessage,
      troubleshooting,
    };
  }
}

/**
 * Sends a test email using Gmail SMTP, AWS SES SMTP, or AWS SES API
 */
export async function sendTestSmtpEmail({
  from,
  to,
  subject,
  message,
  isHtml = true,
  method = 'gmail', // 'gmail' | 'smtp' | 'ses_api' | 'godaddy'
}: {
  from?: string;
  to: string;
  subject: string;
  message: string;
  isHtml?: boolean;
  method?: 'gmail' | 'smtp' | 'ses_api' | 'godaddy';
}): Promise<{
  success: boolean;
  messageId?: string;
  response?: string;
  methodUsed?: string;
  error?: string;
  troubleshooting?: string[];
}> {
  const config = getSmtpConfig();
  const defaultFrom =
    method === 'gmail'
      ? process.env.GMAIL_FROM_EMAIL || config.gmailUser || 'Flight CRM <notifications@flightcrm.com>'
      : method === 'godaddy'
      ? process.env.GODADDY_FROM_EMAIL || process.env.GODADDY_SMTP_USER || process.env.GODADDY_EMAIL || 'support@airlinesconsolidator.com'
      : process.env.SES_FROM_EMAIL || 'Flight CRM <notifications@flightcrm.com>';
  const fromAddress = from?.trim() || defaultFrom;

  if (!to || !subject || !message) {
    return {
      success: false,
      error: 'To, Subject, and Message fields are required.',
    };
  }

  // Method 1: Gmail SMTP
  if (method === 'gmail') {
    try {
      const transporter = createGmailTransporter();
      const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: to.trim(),
        subject: subject.trim(),
        ...(isHtml ? { html: message, text: message.replace(/<[^>]*>?/gm, '') } : { text: message }),
      };

      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        methodUsed: 'Gmail SMTP',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Gmail SMTP failed to send email',
        methodUsed: 'Gmail SMTP',
        troubleshooting: [
          'Verify your GMAIL_USER / SMTP_USER and GMAIL_APP_PASSWORD / SMTP_PASSWORD in .env.',
          'Ensure you are using a 16-character App Password generated in your Google Account security settings.',
        ],
      };
    }
  }

  // Method 2: GoDaddy Workspace SMTP
  if (method === 'godaddy') {
    try {
      const transporter = createGodaddyTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: to.trim(),
        subject: subject.trim(),
        ...(isHtml ? { html: message, text: message.replace(/<[^>]*>?/gm, '') } : { text: message }),
      });
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        methodUsed: 'GoDaddy SMTP',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'GoDaddy SMTP send failed',
        methodUsed: 'GoDaddy SMTP',
        troubleshooting: [
          'Verify GODADDY_SMTP_USER (full email) and GODADDY_SMTP_PASSWORD in .env.',
          'Check smtpout.secureserver.net port 465 (SSL) is accessible from your server.',
        ],
      };
    }
  }

  // Method 3: AWS SES API SDK
  if (method === 'ses_api') {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.SES_KEY;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SES_SECRET;
    const region = process.env.AWS_REGION || process.env.SES_REGION || 'ap-south-1';

    if (!accessKeyId || !secretAccessKey) {
      return {
        success: false,
        error: 'AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are missing in .env.',
      };
    }

    try {
      const sesClient = new SESClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      const command = new SendEmailCommand({
        Destination: { ToAddresses: [to.trim()] },
        Message: {
          Body: {
            Html: isHtml ? { Charset: 'UTF-8', Data: message } : undefined,
            Text: !isHtml
              ? { Charset: 'UTF-8', Data: message }
              : { Charset: 'UTF-8', Data: message.replace(/<[^>]*>?/gm, '') },
          },
          Subject: { Charset: 'UTF-8', Data: subject.trim() },
        },
        Source: fromAddress,
      });

      const response = await sesClient.send(command);
      return {
        success: true,
        messageId: response.MessageId,
        methodUsed: 'AWS SES API (SDK)',
      };
    } catch (err: any) {
      const rawError = err.message || String(err);
      const troubleshooting: string[] = [];

      if (rawError.includes('MessageRejected') || rawError.includes('Email address is not verified') || rawError.includes('554')) {
        troubleshooting.push(
          'SES Sandbox Restriction: When in SES Sandbox mode, BOTH the From address AND the To address must be verified identities in AWS SES Console.'
        );
        troubleshooting.push(`Ensure "${fromAddress}" is verified in AWS SES (${region}).`);
        troubleshooting.push(`Ensure "${to}" is also verified in AWS SES if in Sandbox mode.`);
      }

      return {
        success: false,
        error: rawError,
        methodUsed: 'AWS SES API (SDK)',
        troubleshooting,
      };
    }
  }

  // Method 3: AWS SES SMTP (Nodemailer)
  try {
    const transporter = createSmtpTransporter();
    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      to: to.trim(),
      subject: subject.trim(),
      ...(isHtml ? { html: message, text: message.replace(/<[^>]*>?/gm, '') } : { text: message }),
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      methodUsed: 'AWS SES SMTP (Nodemailer)',
    };
  } catch (err: any) {
    const rawError = err.message || String(err);
    const troubleshooting: string[] = [];

    if (rawError.includes('Invalid login') || rawError.includes('535') || rawError.includes('Authentication')) {
      troubleshooting.push(
        'SES SMTP Authentication failed (535): Generate dedicated credentials in AWS SES -> SMTP Settings -> "Create SMTP credentials".'
      );
      troubleshooting.push('Or switch method to "Gmail SMTP" or "AWS SES API (SDK)".');
    }

    return {
      success: false,
      error: rawError,
      methodUsed: 'AWS SES SMTP (Nodemailer)',
      troubleshooting,
    };
  }
}
