import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { getAuthUser, hashPassword } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const { name, email, role, active, phone, password } = await req.json();

    await connectToDatabase();
    const staff = await User.findById(id);

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (name) staff.name = name.trim();
    if (email) staff.email = email.toLowerCase().trim();
    if (role && (role === 'admin' || role === 'staff')) staff.role = role;
    if (active !== undefined) staff.active = Boolean(active);
    if (phone !== undefined) staff.phone = phone.trim();

    if (password && password.trim().length > 0) {
      staff.password = await hashPassword(password);
    }

    await staff.save();

    const sanitized = staff.toObject();
    delete sanitized.password;

    return NextResponse.json({ success: true, staff: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
