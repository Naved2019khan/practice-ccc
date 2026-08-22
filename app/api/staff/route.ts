import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Lead } from '@/models/Lead';
import { getAuthUser, hashPassword } from '@/lib/auth';

// GET /api/staff - List all staff & their performance metrics (Admin only)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();
    const staffMembers = await User.find({}).select('-password').sort({ createdAt: -1 });

    // Aggregate metrics per staff
    const staffWithMetrics = await Promise.all(
      staffMembers.map(async (staff) => {
        const totalLeads = await Lead.countDocuments({ assignedTo: staff._id });
        const activeLeads = await Lead.countDocuments({
          assignedTo: staff._id,
          stage: { $nin: ['Ticketed', 'Lost'] },
        });
        const ticketedLeads = await Lead.countDocuments({
          assignedTo: staff._id,
          stage: 'Ticketed',
        });
        const conversionRate = totalLeads > 0 ? Math.round((ticketedLeads / totalLeads) * 100) : 0;

        return {
          ...staff.toObject(),
          totalLeads,
          activeLeads,
          ticketedLeads,
          conversionRate,
        };
      })
    );

    return NextResponse.json({ staff: staffWithMetrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/staff - Create a new staff account (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { name, email, password, role = 'staff', active = true, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newStaff = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'staff',
      active: Boolean(active),
      phone: phone?.trim(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    const sanitized = newStaff.toObject();
    delete sanitized.password;

    return NextResponse.json({ success: true, staff: sanitized }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
