import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { testSmtpConnection } from '@/lib/ses-smtp';

export async function GET(req: NextRequest) {
  return handleTestConnection(req);
}

export async function POST(req: NextRequest) {
  return handleTestConnection(req);
}

async function handleTestConnection(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized. Admin / Developer access required.' }, { status: 403 });
    }

    let provider: 'gmail' | 'smtp' | 'ses_api' | undefined;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      provider = body.provider;
    }
    if (!provider) {
      const { searchParams } = new URL(req.url);
      provider = (searchParams.get('provider') as any) || undefined;
    }

    const result = await testSmtpConnection({ provider });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[SMTP Connection Test Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while testing SMTP connection.',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
