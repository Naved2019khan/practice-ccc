import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { Lead } from '@/models/Lead';
import { getAuthUser } from '@/lib/auth';
import { sendTaskNotificationEmail } from '@/lib/email';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');

    const query: any = {};
    if (user.role === 'staff') {
      query.assignedTo = user._id;
    }

    if (leadId && mongoose.Types.ObjectId.isValid(leadId)) {
      query.leadId = new mongoose.Types.ObjectId(leadId);
    }

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name origin destination stage')
      .sort({ dueDate: 1 });

    return NextResponse.json({ tasks });
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

    const {
      title,
      description,
      leadId,
      assignedTo: reqAssignedTo,
      priority = 'Medium',
      dueDate,
      sendEmailAlert = false,
    } = await req.json();

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Title and due date are required' }, { status: 400 });
    }

    await connectToDatabase();

    const assignedToId =
      reqAssignedTo && mongoose.Types.ObjectId.isValid(reqAssignedTo)
        ? new mongoose.Types.ObjectId(reqAssignedTo)
        : (user._id as mongoose.Types.ObjectId);

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim(),
      leadId: leadId && mongoose.Types.ObjectId.isValid(leadId) ? new mongoose.Types.ObjectId(leadId) : null,
      assignedTo: assignedToId,
      priority,
      dueDate: new Date(dueDate),
      status: 'Pending',
      sendEmailAlert: Boolean(sendEmailAlert),
    });

    // If sendEmailAlert is requested, dispatch email via SES or Gmail SMTP
    if (sendEmailAlert) {
      try {
        const staffUser = await User.findById(assignedToId);
        let leadName: string | undefined;
        if (task.leadId) {
          const lead = await Lead.findById(task.leadId);
          leadName = lead ? `${lead.name} (${lead.origin} → ${lead.destination})` : undefined;
        }

        if (staffUser && staffUser.email) {
          await sendTaskNotificationEmail(
            staffUser.email,
            staffUser.name,
            task.title,
            task.dueDate,
            task.priority,
            leadName
          );
          task.emailSentAt = new Date();
          await task.save();
        }
      } catch (err: any) {
        console.error('Task email alert error:', err.message);
      }
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name origin destination stage');

    return NextResponse.json({ success: true, task: populatedTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
