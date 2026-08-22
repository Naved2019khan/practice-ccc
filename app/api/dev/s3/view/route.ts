import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getS3Client, getS3Config, getContentTypeFromExt } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const s3Config = getS3Config();
    if (!s3Config.isConfigured) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 400 });
    }

    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    const s3Response = await client.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ error: 'Object body is empty' }, { status: 404 });
    }

    const contentType =
      s3Response.ContentType || getContentTypeFromExt(key.split('/').pop() || key);

    // Convert readable stream to byte array
    const byteArray = await s3Response.Body.transformToByteArray();

    return new NextResponse(Buffer.from(byteArray), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': byteArray.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('[S3 View Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve object from S3' },
      { status: error.$metadata?.httpStatusCode || 500 }
    );
  }
}
