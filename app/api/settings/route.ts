import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Setting } from '@/models/Setting';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const settingsDocs = await Setting.find({});
    const settings: Record<string, any> = {
      autoAssignEnabled: true,
      companyName: 'AirlinesConsolidator',
      defaultCurrency: 'USD',
      emailProvider: process.env.EMAIL_PROVIDER || 'mock',
    };

    settingsDocs.forEach((s) => {
      settings[s.key] = s.value;
    });

    const activeStaffCount = await User.countDocuments({ role: 'staff', active: true });

    return NextResponse.json({ settings, activeStaffCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { key, value, testEmailAddress } = await req.json();

    await connectToDatabase();

    // If test email requested
    if (testEmailAddress) {
      const emailResult = await sendEmail({
        to: testEmailAddress,
        subject: 'Flight CRM — Email Configuration Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #D6D3D1; border-radius: 8px;">
            <h2 style="color: #C2410C;">Email Test Successful!</h2>
            <p>Your email provider (<strong>${process.env.EMAIL_PROVIDER || 'mock'}</strong>) is properly configured.</p>
            <p>Sent by <strong>${user.name}</strong> on ${new Date().toLocaleString()}.</p>
          </div>
        `,
        text: 'Email Test Successful from Flight CRM!',
      });

      return NextResponse.json({ success: emailResult.success, error: emailResult.error });
    }

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
    }

    await Setting.findOneAndUpdate(
      { key },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, key, value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
