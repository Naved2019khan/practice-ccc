import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { sendTestSmtpEmail, getSmtpConfig } from '@/lib/ses-smtp';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized. Admin / Developer access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { from, to, subject, message, isHtml = true, method = 'smtp' } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Recipient (To), Subject, and Message body are required.' },
        { status: 400 }
      );
    }

    const result = await sendTestSmtpEmail({
      from,
      to,
      subject,
      message,
      isHtml,
      method,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[SES SMTP Test Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test email',
      },
      { status: 500 }
    );
  }
}
