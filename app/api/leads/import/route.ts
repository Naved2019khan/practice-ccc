import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { getNextRoundRobinStaff } from '@/lib/assignment';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows, duplicateHandling = 'skip' } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for import' }, { status: 400 });
    }

    await connectToDatabase();

    let importedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name?.toString().trim();
      const phone = row.phone?.toString().trim();
      const origin = row.origin?.toString().trim() || 'N/A';
      const destination = row.destination?.toString().trim() || 'N/A';

      if (!name || !phone) {
        errors.push(`Row ${i + 1}: Name and phone are required.`);
        skippedCount++;
        continue;
      }

      // Check duplicate by phone
      const existingLead = await Lead.findOne({ phone });

      if (existingLead) {
        if (duplicateHandling === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateHandling === 'update') {
          if (row.email) existingLead.email = row.email.toString().trim();
          if (row.origin) existingLead.origin = origin;
          if (row.destination) existingLead.destination = destination;
          if (row.priceQuoted) existingLead.priceQuoted = Number(row.priceQuoted) || existingLead.priceQuoted;
          if (row.stage) existingLead.stage = row.stage;
          if (row.paymentStatus) existingLead.paymentStatus = row.paymentStatus;
          if (row.pnr) existingLead.pnr = row.pnr.toString().trim();

          existingLead.activityLog.push({
            id: `act_${Date.now()}_${i}`,
            type: 'import_update',
            description: `Updated via bulk import by ${user.name}`,
            actorName: user.name,
            timestamp: new Date(),
          });

          await existingLead.save();
          updatedCount++;
          continue;
        }
        // If 'force', proceed to create new lead despite duplicate phone
      }

      // Determine staff assignment
      let assignedToId: mongoose.Types.ObjectId | null = null;
      let assignDesc = 'Unassigned';

      if (row.assignedTo && mongoose.Types.ObjectId.isValid(row.assignedTo)) {
        assignedToId = new mongoose.Types.ObjectId(row.assignedTo);
        const assignedUser = await User.findById(assignedToId);
        assignDesc = assignedUser ? assignedUser.name : 'Assigned Staff';
      } else {
        const roundRobin = await getNextRoundRobinStaff();
        if (roundRobin.autoAssigned && roundRobin.assignedTo) {
          assignedToId = roundRobin.assignedTo;
          assignDesc = `Auto-assigned to ${roundRobin.assignedStaffName}`;
        }
      }

      const travelDate = row.travelDate ? new Date(row.travelDate) : undefined;
      const nextFollowUpDate = row.nextFollowUpDate ? new Date(row.nextFollowUpDate) : undefined;

      await Lead.create({
        name,
        phone,
        email: row.email?.toString().trim(),
        source: row.source || 'Import',
        origin,
        destination,
        travelDate: isNaN(travelDate?.getTime() || NaN) ? undefined : travelDate,
        pax: Number(row.pax) || 1,
        tripType: row.tripType || 'Round Trip',
        stage: row.stage || 'New',
        assignedTo: assignedToId,
        paymentStatus: row.paymentStatus || 'Pending',
        pnr: row.pnr?.toString().trim(),
        invoiceNumber: row.invoiceNumber?.toString().trim(),
        priceQuoted: Number(row.priceQuoted) || 0,
        currency: row.currency || 'USD',
        nextFollowUpDate: isNaN(nextFollowUpDate?.getTime() || NaN) ? undefined : nextFollowUpDate,
        notes: row.notes
          ? [
              {
                id: `note_${Date.now()}_${i}`,
                text: row.notes.toString().trim(),
                authorName: user.name,
                authorRole: user.role,
                createdAt: new Date(),
              },
            ]
          : [],
        activityLog: [
          {
            id: `act_${Date.now()}_${i}`,
            type: 'lead_imported',
            description: `Imported via file by ${user.name} (${assignDesc})`,
            actorName: user.name,
            timestamp: new Date(),
          },
        ],
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: rows.length,
        importedCount,
        skippedCount,
        updatedCount,
        errors,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
