import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { getNextRoundRobinStaff } from '@/lib/assignment';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const isSummary = searchParams.get('summary') === 'true';
    const search = searchParams.get('search')?.trim() || '';
    const stage = searchParams.get('stage')?.trim() || '';
    const source = searchParams.get('source')?.trim() || '';
    const paymentStatus = searchParams.get('paymentStatus')?.trim() || '';
    const staffId = searchParams.get('staffId')?.trim() || '';
    const urgency = searchParams.get('urgency')?.trim() || ''; // 'overdue', 'today', 'upcoming'

    // Base query with RBAC
    const query: any = {};

    if (user.role === 'staff') {
      // Staff can ONLY see leads assigned to them
      query.assignedTo = user._id;
    } else if (staffId) {
      if (staffId === 'unassigned') {
        query.assignedTo = null;
      } else if (mongoose.Types.ObjectId.isValid(staffId)) {
        query.assignedTo = new mongoose.Types.ObjectId(staffId);
      }
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // If summary is requested, return counts
    if (isSummary) {
      const totalLeads = await Lead.countDocuments(query);
      const newLeadsToday = await Lead.countDocuments({
        ...query,
        createdAt: { $gte: todayStart },
      });

      const dueToday = await Lead.countDocuments({
        ...query,
        stage: { $nin: ['Ticketed', 'Lost'] },
        nextFollowUpDate: { $gte: todayStart, $lt: tomorrowStart },
      });

      const overdue = await Lead.countDocuments({
        ...query,
        stage: { $nin: ['Ticketed', 'Lost'] },
        nextFollowUpDate: { $lt: todayStart },
      });

      const ticketedLeads = await Lead.find({ ...query, stage: 'Ticketed' });
      const bookedRevenue = ticketedLeads.reduce((sum, l) => sum + (l.priceQuoted || 0), 0);

      // Stage breakdown
      const stages = ['New', 'Contacted', 'Quoted', 'Negotiation', 'Booked', 'Ticketed', 'Lost'];
      const stageCounts: Record<string, number> = {};
      for (const s of stages) {
        stageCounts[s] = await Lead.countDocuments({ ...query, stage: s });
      }

      return NextResponse.json({
        counts: {
          total: totalLeads,
          newToday: newLeadsToday,
          dueToday,
          overdue,
          bookedRevenue,
          conversionRate: totalLeads > 0 ? Math.round((stageCounts['Ticketed'] / totalLeads) * 100) : 0,
          stages: stageCounts,
        },
      });
    }

    // Apply Filters
    if (stage) query.stage = stage;
    if (source) query.source = source;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Follow-up urgency filter
    if (urgency === 'overdue') {
      query.nextFollowUpDate = { $lt: todayStart };
      query.stage = { $nin: ['Ticketed', 'Lost'] };
    } else if (urgency === 'today') {
      query.nextFollowUpDate = { $gte: todayStart, $lt: tomorrowStart };
      query.stage = { $nin: ['Ticketed', 'Lost'] };
    } else if (urgency === 'upcoming') {
      query.nextFollowUpDate = { $gte: tomorrowStart };
      query.stage = { $nin: ['Ticketed', 'Lost'] };
    }

    // Search query across name, phone, email, origin, destination, pnr
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { origin: searchRegex },
        { destination: searchRegex },
        { pnr: searchRegex },
        { invoiceNumber: searchRegex },
      ];
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email avatar role')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ leads });
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

    const body = await req.json();
    const {
      name,
      phone,
      email,
      source = 'Website',
      origin,
      destination,
      travelDate,
      returnDate,
      pax = 1,
      tripType = 'Round Trip',
      stage = 'New',
      assignedTo: reqAssignedTo,
      paymentStatus = 'Pending',
      pnr,
      invoiceNumber,
      priceQuoted = 0,
      currency = 'USD',
      nextFollowUpDate,
      initialNote,
    } = body;

    if (!name || !phone || !origin || !destination) {
      return NextResponse.json(
        { error: 'Name, phone, origin, and destination are required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Determine staff assignment
    let finalAssignedTo: mongoose.Types.ObjectId | null = null;
    let assignmentMethod = 'Unassigned';

    if (reqAssignedTo && mongoose.Types.ObjectId.isValid(reqAssignedTo)) {
      finalAssignedTo = new mongoose.Types.ObjectId(reqAssignedTo);
      const assignedStaff = await User.findById(finalAssignedTo);
      assignmentMethod = assignedStaff ? assignedStaff.name : 'Selected Staff';
    } else if (user.role === 'staff') {
      // Staff creating lead assigns to self
      finalAssignedTo = user._id as mongoose.Types.ObjectId;
      assignmentMethod = user.name;
    } else {
      // Try Round-Robin auto assignment
      const roundRobin = await getNextRoundRobinStaff();
      if (roundRobin.autoAssigned && roundRobin.assignedTo) {
        finalAssignedTo = roundRobin.assignedTo;
        assignmentMethod = `Auto-assigned to ${roundRobin.assignedStaffName}`;
      }
    }

    const notes = [];
    if (initialNote && initialNote.trim()) {
      notes.push({
        id: `note_${Date.now()}`,
        text: initialNote.trim(),
        authorName: user.name,
        authorRole: user.role,
        createdAt: new Date(),
      });
    }

    const activityLog = [
      {
        id: `act_${Date.now()}`,
        type: 'lead_created',
        description: `Lead created manually by ${user.name} (${assignmentMethod})`,
        actorName: user.name,
        timestamp: new Date(),
      },
    ];

    const newLead = await Lead.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      source,
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate: travelDate ? new Date(travelDate) : undefined,
      returnDate: returnDate ? new Date(returnDate) : undefined,
      pax: Number(pax) || 1,
      tripType,
      stage,
      assignedTo: finalAssignedTo,
      paymentStatus,
      pnr: pnr?.trim(),
      invoiceNumber: invoiceNumber?.trim(),
      priceQuoted: Number(priceQuoted) || 0,
      currency,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      notes,
      activityLog,
    });

    const populatedLead = await Lead.findById(newLead._id).populate(
      'assignedTo',
      'name email avatar role'
    );

    return NextResponse.json({ success: true, lead: populatedLead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
