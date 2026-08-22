import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getS3Config } from '@/lib/s3';
import { getSmtpConfig } from '@/lib/ses-smtp';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized. Admin / Developer access required.' }, { status: 403 });
    }

    const s3Config = getS3Config();
    const smtpConfig = getSmtpConfig();
    const activeProvider = process.env.EMAIL_PROVIDER || 'gmail';

    return NextResponse.json({
      environment: process.env.NODE_ENV || 'development',
      activeProvider,
      gmail: {
        isConfigured: smtpConfig.isGmailConfigured,
        user: smtpConfig.gmailUser,
        maskedUser: smtpConfig.gmailUser
          ? smtpConfig.gmailUser.length > 8
            ? `${smtpConfig.gmailUser.substring(0, 3)}...${smtpConfig.gmailUser.substring(smtpConfig.gmailUser.indexOf('@'))}`
            : '***'
          : null,
        defaultFromEmail: process.env.GMAIL_FROM_EMAIL || smtpConfig.gmailUser || 'Flight CRM <notifications@flightcrm.com>',
      },
      s3: {
        isConfigured: s3Config.isConfigured,
        hasCredentials: s3Config.hasCredentials,
        hasBucket: s3Config.hasBucket,
        hasRegion: s3Config.hasRegion,
        bucket: s3Config.bucket || null,
        region: s3Config.region || null,
        customDomain: s3Config.customDomain || null,
        maskedAccessKey: s3Config.accessKeyId
          ? `${s3Config.accessKeyId.substring(0, 4)}...${s3Config.accessKeyId.slice(-4)}`
          : null,
      },
      smtp: {
        isConfigured: smtpConfig.isConfigured,
        host: smtpConfig.host,
        port: smtpConfig.port,
        region: smtpConfig.region,
        hasUser: Boolean(smtpConfig.user),
        hasPassword: smtpConfig.hasPassword,
        maskedUser: smtpConfig.user
          ? smtpConfig.user.length > 8
            ? `${smtpConfig.user.substring(0, 4)}...${smtpConfig.user.slice(-4)}`
            : '***'
          : null,
        defaultFromEmail: process.env.SES_FROM_EMAIL || process.env.GMAIL_FROM_EMAIL || 'Flight CRM <notifications@flightcrm.com>',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to read env configuration' }, { status: 500 });
  }
}
