import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { deleteS3File, getS3Config } from '@/lib/s3';

export async function POST(req: NextRequest) {
  return handleDelete(req);
}

export async function DELETE(req: NextRequest) {
  return handleDelete(req);
}

async function handleDelete(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized. Admin / Developer access required.' }, { status: 403 });
    }

    const s3Config = getS3Config();
    if (!s3Config.isConfigured) {
      return NextResponse.json(
        { error: 'AWS S3 is not configured in .env.' },
        { status: 400 }
      );
    }

    let key = '';
    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url);
      key = searchParams.get('key') || '';
    }

    if (!key) {
      const body = await req.json().catch(() => ({}));
      key = body.key || '';
    }

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "key" parameter.' }, { status: 400 });
    }

    await deleteS3File(key);

    return NextResponse.json({
      success: true,
      message: `Object "${key}" deleted successfully from S3 bucket ${s3Config.bucket}`,
      key,
    });
  } catch (error: any) {
    console.error('[S3 Delete Error]:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete object from S3',
        details: error.name || 'DeleteError',
      },
      { status: 500 }
    );
  }
}
