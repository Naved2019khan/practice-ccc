import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  _Object,
} from '@aws-sdk/client-s3';

export interface S3FileItem {
  key: string;
  name: string;
  size: number;
  formattedSize: string;
  lastModified?: string;
  contentType: string;
  url: string;
  previewUrl: string;
  isImage: boolean;
}

export function getS3Config() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.SES_KEY || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SES_SECRET || '';
  const region = process.env.AWS_REGION || process.env.SES_REGION || 'us-east-1';
  const bucket =
    process.env.AWS_S3_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    process.env.AWS_BUCKET_NAME ||
    '';
  const customDomain = process.env.AWS_S3_CUSTOM_DOMAIN || process.env.CLOUDFRONT_URL || '';

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    customDomain,
    isConfigured: Boolean(accessKeyId && secretAccessKey && bucket),
    hasCredentials: Boolean(accessKeyId && secretAccessKey),
    hasBucket: Boolean(bucket),
    hasRegion: Boolean(region),
  };
}

export function getS3Client(): S3Client {
  const config = getS3Config();
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error(
      'AWS credentials missing. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env'
    );
  }

  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getS3ObjectUrl(key: string, bucket: string, region: string, customDomain?: string): string {
  if (customDomain) {
    const cleanDomain = customDomain.replace(/\/+$/, '');
    return `${cleanDomain}/${key.replace(/^\/+/, '')}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key.replace(/^\/+/, '')}`;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'bmp', 'ico', 'avif']);

export function isImageFile(fileName: string, contentType?: string): boolean {
  if (contentType?.startsWith('image/')) return true;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
}

export function getContentTypeFromExt(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * List objects from configured S3 Bucket
 */
export async function listS3Files(prefix = '', maxKeys = 100): Promise<{
  files: S3FileItem[];
  bucket: string;
  region: string;
  totalCount: number;
}> {
  const config = getS3Config();
  if (!config.isConfigured) {
    throw new Error(
      `S3 is not fully configured. Missing: ${[
        !config.hasCredentials && 'AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY',
        !config.hasBucket && 'AWS_S3_BUCKET',
      ]
        .filter(Boolean)
        .join(', ')}`
    );
  }

  const client = getS3Client();
  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: prefix || undefined,
    MaxKeys: maxKeys,
  });

  const response = await client.send(command);
  const rawContents = response.Contents || [];

  const files: S3FileItem[] = rawContents
    .filter((item) => item.Key && !item.Key.endsWith('/')) // Filter out pure folder placeholders
    .map((item) => {
      const key = item.Key!;
      const name = key.split('/').pop() || key;
      const size = item.Size || 0;
      const lastModified = item.LastModified ? item.LastModified.toISOString() : undefined;
      const contentType = getContentTypeFromExt(name);
      const url = getS3ObjectUrl(key, config.bucket, config.region, config.customDomain);
      const isImg = isImageFile(name, contentType);

      return {
        key,
        name,
        size,
        formattedSize: formatBytes(size),
        lastModified,
        contentType,
        url,
        previewUrl: `/api/dev/s3/view?key=${encodeURIComponent(key)}`,
        isImage: isImg,
      };
    })
    .sort((a, b) => {
      // Sort newest first
      const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return timeB - timeA;
    });

  return {
    files,
    bucket: config.bucket,
    region: config.region,
    totalCount: files.length,
  };
}

/**
 * Upload a file buffer to S3 Bucket
 */
export async function uploadS3File(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = 'uploads'
): Promise<S3FileItem> {
  const config = getS3Config();
  if (!config.isConfigured) {
    throw new Error('S3 is not configured. Please check environment variables.');
  }

  const client = getS3Client();

  // Clean filename and create unique timestamped key
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  const datePrefix = new Date().toISOString().slice(0, 10);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const key = folder ? `${folder}/${datePrefix}/${randomSuffix}_${cleanName}` : `${datePrefix}/${randomSuffix}_${cleanName}`;

  const resolvedContentType = contentType || getContentTypeFromExt(originalName);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: resolvedContentType,
  });

  await client.send(command);

  const url = getS3ObjectUrl(key, config.bucket, config.region, config.customDomain);
  const isImg = isImageFile(originalName, resolvedContentType);

  return {
    key,
    name: originalName,
    size: buffer.length,
    formattedSize: formatBytes(buffer.length),
    lastModified: new Date().toISOString(),
    contentType: resolvedContentType,
    url,
    previewUrl: `/api/dev/s3/view?key=${encodeURIComponent(key)}`,
    isImage: isImg,
  };
}

/**
 * Delete an object from S3 Bucket
 */
export async function deleteS3File(key: string): Promise<{ success: boolean; key: string }> {
  const config = getS3Config();
  if (!config.isConfigured) {
    throw new Error('S3 is not configured.');
  }

  if (!key || typeof key !== 'string') {
    throw new Error('Valid S3 key is required.');
  }

  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await client.send(command);
  return { success: true, key };
}
