import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listS3Files, getS3Config } from '@/lib/s3';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized. Admin / Developer access required.' }, { status: 403 });
    }

    const s3Config = getS3Config();
    if (!s3Config.isConfigured) {
      return NextResponse.json(
        {
          configured: false,
          files: [],
          error: 'AWS S3 is not fully configured in your .env file.',
          missing: [
            !s3Config.hasCredentials && 'AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY',
            !s3Config.hasBucket && 'AWS_S3_BUCKET',
          ].filter(Boolean),
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get('prefix') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const result = await listS3Files(prefix, limit);
    return NextResponse.json({
      configured: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[S3 List Error]:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to list S3 objects',
        details: error.name || 'S3Error',
      },
      { status: 500 }
    );
  }
}
