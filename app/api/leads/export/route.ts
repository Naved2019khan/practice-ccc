import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { getAuthUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv'; // 'csv' | 'xlsx'
    const stage = searchParams.get('stage') || '';

    const query: any = {};
    if (user.role === 'staff') {
      query.assignedTo = user._id;
    }
    if (stage) {
      query.stage = stage;
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    const exportRows = leads.map((l: any) => ({
      'Lead ID': l._id.toString(),
      'Passenger Name': l.name,
      Phone: l.phone,
      Email: l.email || '',
      Source: l.source || '',
      Origin: l.origin,
      Destination: l.destination,
      'Travel Date': l.travelDate ? new Date(l.travelDate).toISOString().split('T')[0] : '',
      'Return Date': l.returnDate ? new Date(l.returnDate).toISOString().split('T')[0] : '',
      Pax: l.pax,
      'Trip Type': l.tripType,
      'Booking Type': l.bookingType || '',
      Status: l.status || '',
      Stage: l.stage,
      'Assigned Agent': l.assignedTo ? l.assignedTo.name : 'Unassigned',
      'Payment Status': l.paymentStatus,
      'PNR / Reference': l.pnr || '',
      'Invoice Number': l.invoiceNumber || '',
      'Quoted Price': l.priceQuoted || 0,
      Currency: l.currency || 'USD',
      'Next Follow-Up': l.nextFollowUpDate
        ? new Date(l.nextFollowUpDate).toISOString().split('T')[0]
        : '',
      'Created Date': new Date(l.createdAt).toISOString().split('T')[0],
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Flight Leads');

    if (format === 'xlsx') {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="flight-leads.xlsx"',
        },
      });
    }

    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    return new NextResponse(csvOutput, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="flight-leads.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
