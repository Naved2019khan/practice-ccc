import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { getAuthUser } from '@/lib/auth';
import { uploadS3File, deleteS3File, getS3Config, formatBytes } from '@/lib/s3';
import mongoose from 'mongoose';

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    await connectToDatabase();
    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 25MB maximum limit.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalName = file.name;
    const fileType = file.type || 'application/octet-stream';
    const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let fileUrl = '';
    let s3Key: string | undefined = undefined;

    // 1. Try uploading to S3 if configured
    const s3Config = getS3Config();
    if (s3Config.isConfigured) {
      try {
        const s3Result = await uploadS3File(buffer, originalName, fileType, `tickets/lead_${id}`);
        fileUrl = s3Result.previewUrl || s3Result.url;
        s3Key = s3Result.key;
      } catch (s3Err) {
        console.error('S3 upload fallback error:', s3Err);
      }
    }

    // 2. Fallback: Base64 data URL if S3 is not available
    if (!fileUrl) {
      const base64 = buffer.toString('base64');
      fileUrl = `data:${fileType};base64,${base64}`;
    }

    const newAttachment = {
      id: attachmentId,
      fileName: originalName.replace(/[^a-zA-Z0-9.-]/g, '_'),
      originalName,
      fileSize: file.size,
      formattedSize: formatBytes(file.size),
      fileType,
      url: fileUrl,
      s3Key,
      uploadedBy: user.name,
      uploadedAt: new Date(),
    };

    if (!lead.attachments) {
      lead.attachments = [];
    }

    lead.attachments.push(newAttachment);

    lead.activityLog.push({
      id: `act_att_${Date.now()}`,
      type: 'attachment_added',
      description: `Ticket/Document attached: "${originalName}" (${newAttachment.formattedSize}) by ${user.name}`,
      actorName: user.name,
      timestamp: new Date(),
      meta: { attachmentId, originalName, fileSize: file.size },
    });

    await lead.save();

    return NextResponse.json({
      success: true,
      message: 'Attachment uploaded successfully',
      attachment: newAttachment,
    });
  } catch (error: any) {
    console.error('[Lead Attachment Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload attachment' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Missing attachmentId' }, { status: 400 });
    }

    await connectToDatabase();
    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const targetAttachment = lead.attachments?.find((att: any) => att.id === attachmentId);
    if (!targetAttachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from S3 if s3Key exists
    if (targetAttachment.s3Key) {
      try {
        await deleteS3File(targetAttachment.s3Key);
      } catch (err) {
        console.error('S3 file deletion error:', err);
      }
    }

    lead.attachments = lead.attachments.filter((att: any) => att.id !== attachmentId);

    lead.activityLog.push({
      id: `act_att_del_${Date.now()}`,
      type: 'attachment_deleted',
      description: `Attachment removed: "${targetAttachment.originalName}" by ${user.name}`,
      actorName: user.name,
      timestamp: new Date(),
    });

    await lead.save();

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully',
      attachmentId,
    });
  } catch (error: any) {
    console.error('[Lead Attachment Delete Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete attachment' }, { status: 500 });
  }
}
