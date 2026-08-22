import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadS3File, getS3Config } from '@/lib/s3';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/avif',
  'image/bmp',
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized. Admin / Developer access required.' }, { status: 403 });
    }

    const s3Config = getS3Config();
    if (!s3Config.isConfigured) {
      return NextResponse.json(
        { error: 'AWS S3 is not configured in .env. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file was uploaded in the request.' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 25MB maximum limit.` },
        { status: 400 }
      );
    }

    // Validate mime type
    const mimeType = file.type || 'application/octet-stream';
    const isImage = ALLOWED_MIME_TYPES.has(mimeType) || file.name.match(/\.(jpe?g|png|webp|svg|gif|avif|bmp)$/i);
    if (!isImage) {
      return NextResponse.json(
        { error: `Unsupported file format (${mimeType}). Supported formats: JPG, PNG, WEBP, SVG, GIF.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadedFile = await uploadS3File(buffer, file.name, mimeType, folder);

    return NextResponse.json({
      success: true,
      message: 'File successfully uploaded to AWS S3',
      file: uploadedFile,
    });
  } catch (error: any) {
    console.error('[S3 Upload Error]:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to upload file to S3',
        details: error.name || 'UploadError',
      },
      { status: 500 }
    );
  }
}
