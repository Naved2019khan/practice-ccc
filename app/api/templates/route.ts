import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { EmailTemplate } from '@/models/EmailTemplate';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const templates = await EmailTemplate.find({}).sort({ updatedAt: -1 });

    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, category = 'General', subject, bodyHtml } = await req.json();

    if (!name || !subject || !bodyHtml) {
      return NextResponse.json({ error: 'Name, subject, and body HTML are required' }, { status: 400 });
    }

    await connectToDatabase();
    const template = await EmailTemplate.create({
      name: name.trim(),
      category,
      subject: subject.trim(),
      bodyHtml,
      createdBy: user._id,
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
