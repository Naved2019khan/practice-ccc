import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Lead } from '@/models/Lead';
import { Task } from '@/models/Task';
import { EmailTemplate } from '@/models/EmailTemplate';
import { Setting } from '@/models/Setting';
import { hashPassword } from '@/lib/auth';

export async function seedDatabase(force = false) {
  await connectToDatabase();

  const userCount = await User.countDocuments();
  if (userCount > 0 && !force) {
    console.log('Database already has data. Skipping seed.');
    return { success: true, message: 'Database already seeded' };
  }

  console.log('🌱 Seeding Flight CRM database with realistic data...');

  if (force) {
    await User.deleteMany({});
    await Lead.deleteMany({});
    await Task.deleteMany({});
    await EmailTemplate.deleteMany({});
    await Setting.deleteMany({});
  }

  // 1. Create Users
  const adminPassword = await hashPassword('admin123');
  const staffPassword = await hashPassword('staff123');

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@flightcrm.com',
    password: adminPassword,
    role: 'admin',
    active: true,
    phone: '+1 (888) 883-0727',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  const staff1 = await User.create({
    name: 'Staff One',
    email: 'staff1@flightcrm.com',
    password: staffPassword,
    role: 'staff',
    active: true,
    phone: '+1 (888) 883-0727',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  });

  const staff2 = await User.create({
    name: 'Staff Two',
    email: 'staff2@flightcrm.com',
    password: staffPassword,
    role: 'staff',
    active: true,
    phone: '+1 (888) 883-0727',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  });

  // 2. Default Settings
  // await Setting.create({ key: 'autoAssignEnabled', value: true });
  // await Setting.create({ key: 'roundRobinIndex', value: 0 });
  // await Setting.create({ key: 'companyName', value: 'AirlinesConsolidator' });
  // await Setting.create({ key: 'defaultCurrency', value: 'USD' });

  // 3. Email Templates
  //   await EmailTemplate.create([
  //     {
  //       name: 'Flight Quotation & Options',
  //       category: 'Quotation',
  //       subject: 'Flight Options for {{origin}} to {{destination}} — Ember Flight Concierge',
  //       bodyHtml: `<div style="font-family: 'Source Sans 3', sans-serif, Arial; color: #1C1917; max-width: 600px; margin: 0 auto; background: #FAFAF9; padding: 24px; border: 1px solid #D6D3D1; border-radius: 12px;">
  //   <div style="border-bottom: 2px solid #C2410C; padding-bottom: 12px; margin-bottom: 20px;">
  //     <h2 style="color: #C2410C; margin: 0; font-size: 22px; font-family: 'Playfair Display', Georgia, serif;">Ember Flight Concierge</h2>
  //   </div>
  //   <p>Dear <strong>{{name}}</strong>,</p>
  //   <p>Thank you for reaching out to us for your upcoming trip from <strong>{{origin}}</strong> to <strong>{{destination}}</strong> on <strong>{{travel_date}}</strong>.</p>

  //   <div style="background: #F5F5F4; border-left: 4px solid #C2410C; padding: 16px; border-radius: 8px; margin: 20px 0;">
  //     <h3 style="margin-top: 0; color: #1C1917;">Quoted Itinerary Details:</h3>
  //     <ul style="margin: 0; padding-left: 20px; color: #57534E;">
  //       <li><strong>Route:</strong> {{origin}} &rarr; {{destination}}</li>
  //       <li><strong>Departure Date:</strong> {{travel_date}}</li>
  //       <li><strong>Passengers:</strong> {{pax}}</li>
  //       <li><strong>Total Quoted Fare:</strong> <span style="color: #C2410C; font-weight: 700; font-size: 18px;">{{currency}} {{price}}</span></li>
  //     </ul>
  //   </div>

  //   <p>Please reply directly to this email or click below to review and confirm your reservation before seat fares change.</p>
  //   <p style="margin: 30px 0; text-align: center;">
  //     <a href="https://example.com/confirm-quote" style="background: #C2410C; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Confirm & Lock Fare</a>
  //   </p>

  //   <hr style="border: 0; border-top: 1px solid #D6D3D1; margin: 24px 0;" />
  //   <p style="color: #78716C; font-size: 13px;">Best regards,<br><strong>{{agent_name}}</strong><br>Travel Specialist &bull; Ember Flight Concierge</p>
  // </div>`,
  //       createdBy: admin._id,
  //     },
  //     {
  //       name: 'Urgent Follow-Up & Fare Lock',
  //       category: 'Follow-up',
  //       subject: 'Action Required: Fare Hold expiring for {{origin}} to {{destination}}',
  //       bodyHtml: `<div style="font-family: 'Source Sans 3', sans-serif, Arial; color: #1C1917; max-width: 600px; margin: 0 auto; background: #FAFAF9; padding: 24px; border: 1px solid #D6D3D1; border-radius: 12px;">
  //   <div style="border-bottom: 2px solid #F59E0B; padding-bottom: 12px; margin-bottom: 20px;">
  //     <h2 style="color: #C2410C; margin: 0; font-size: 22px; font-family: 'Playfair Display', Georgia, serif;">Ember Flight Concierge</h2>
  //   </div>
  //   <p>Hello <strong>{{name}}</strong>,</p>
  //   <p>I wanted to follow up regarding your flight inquiry for <strong>{{origin}}</strong> to <strong>{{destination}}</strong> on <strong>{{travel_date}}</strong>.</p>
  //   <p>The airline inventory for the special quoted rate of <strong>{{currency}} {{price}}</strong> is held for only 24 hours. Would you like us to proceed with ticket issuance or adjust your flight timings?</p>
  //   <p style="margin: 25px 0;">
  //     <a href="https://example.com/talk-to-agent" style="background: #F59E0B; color: #1C1917; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Speak with Agent</a>
  //   </p>
  //   <p style="color: #78716C; font-size: 13px;">Warm regards,<br><strong>{{agent_name}}</strong></p>
  // </div>`,
  //       createdBy: admin._id,
  //     },
  //     {
  //       name: 'E-Ticket & Booking Confirmation',
  //       category: 'Ticket Confirmation',
  //       subject: 'E-Ticket Confirmation: {{origin}} to {{destination}} (PNR: {{pnr}})',
  //       bodyHtml: `<div style="font-family: 'Source Sans 3', sans-serif, Arial; color: #1C1917; max-width: 600px; margin: 0 auto; background: #FAFAF9; padding: 24px; border: 1px solid #D6D3D1; border-radius: 12px;">
  //   <div style="border-bottom: 2px solid #16A34A; padding-bottom: 12px; margin-bottom: 20px;">
  //     <h2 style="color: #16A34A; margin: 0; font-size: 22px; font-family: 'Playfair Display', Georgia, serif;">Ticket Issued & Confirmed</h2>
  //   </div>
  //   <p>Dear <strong>{{name}}</strong>,</p>
  //   <p>Your flight booking has been successfully issued. Here are your official travel details:</p>

  //   <div style="background: #F5F5F4; border: 1px dashed #16A34A; padding: 16px; border-radius: 8px; margin: 20px 0;">
  //     <p style="margin: 4px 0;"><strong>Airline PNR / Reference:</strong> <span style="font-family: 'Fira Code', monospace; font-size: 18px; color: #16A34A; font-weight: 700;">{{pnr}}</span></p>
  //     <p style="margin: 4px 0;"><strong>Invoice #:</strong> {{invoice_number}}</p>
  //     <p style="margin: 4px 0;"><strong>Route:</strong> {{origin}} &rarr; {{destination}}</p>
  //     <p style="margin: 4px 0;"><strong>Departure:</strong> {{travel_date}}</p>
  //     <p style="margin: 4px 0;"><strong>Passengers:</strong> {{pax}}</p>
  //   </div>

  //   <p>Please carry a valid government photo ID / passport matching passenger names at check-in.</p>
  //   <p style="color: #78716C; font-size: 13px;">Safe travels,<br><strong>{{agent_name}}</strong> &bull; Ember Flight Concierge</p>
  // </div>`,
  //       createdBy: admin._id,
  //     },
  //     {
  //       name: 'Booking Confirmation & Payment Authorization',
  //       category: 'Ticket Confirmation',
  //       subject: 'Booking Confirmation & Payment Authorization Agreement — Ref {{booking_reference}}',
  //       bodyHtml: `<div style="font-family: Arial, Helvetica, sans-serif; color: #1a2b4c; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E2ECFB;">
  //   <div style="background: linear-gradient(135deg, #0B3C8A 0%, #1657B8 100%); padding: 24px; color: #ffffff;">
  //     <span style="display:inline-block; background-color:#FFC107; color:#0B3C8A; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:12px; text-transform:uppercase;">Booking Confirmed</span>
  //     <h2 style="color:#ffffff; font-size:20px; margin:10px 0 4px 0;">Booking Confirmation &amp; Payment Authorization</h2>
  //     <p style="color:#cfe0ff; font-size:12px; margin:0;">Reference: <strong>{{booking_reference}}</strong> &bull; Agent: <strong>{{agent_name}}</strong></p>
  //   </div>
  //   <div style="padding: 20px;">
  //     <h3 style="color:#0B3C8A; font-size:13px; text-transform:uppercase; margin-top:0;">Passenger Details</h3>
  //     <p style="font-size:13px; margin: 4px 0;"><strong>Name:</strong> {{name}} &bull; <strong>Phone:</strong> {{phone}} &bull; <strong>Email:</strong> {{email}}</p>
  //     <hr style="border:0; border-top:1px solid #E2ECFB; margin:16px 0;" />
  //     <h3 style="color:#0B3C8A; font-size:13px; text-transform:uppercase;">Itinerary Details</h3>
  //     <div style="background:#F3F7FF; border:1px solid #E2ECFB; border-radius:8px; padding:12px; margin:10px 0;">
  //       <p style="margin:4px 0; font-size:13px;"><strong>Flight:</strong> {{flight1_airline}} {{flight1_number}} ({{flight1_class}})</p>
  //       <p style="margin:4px 0; font-size:13px;"><strong>Departure:</strong> {{flight1_dep_airport}} &bull; {{flight1_dep_datetime}}</p>
  //       <p style="margin:4px 0; font-size:13px;"><strong>Arrival:</strong> {{flight1_arr_airport}}</p>
  //     </div>
  //     <div style="background:#FFF7DA; border:1px solid #FFE58A; border-radius:8px; padding:12px; margin:16px 0; font-size:14px; font-weight:bold; color:#7a5c00;">
  //       Total Authorized Amount: <span style="color:#0B3C8A; font-size:18px;">{{currency}} {{price}}</span>
  //     </div>
  //     <p style="font-size:12px; color:#5c6b85;">Authorized Card: <strong>{{card_brand}} ending in {{card_last4}}</strong> &bull; Cardholder: <strong>{{card_holder_name}}</strong></p>
  //     <p style="font-size:12px; color:#5c6b85;">Support Contact: <strong>{{company_phone}}</strong> &bull; {{company_name}}</p>
  //   </div>
  // </div>`,
  //       createdBy: admin._id,
  //     },
  //   ]);

  // Today & Overdue dates for visual badges testing
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
  const overdueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const futureDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days later

  // 4. Create Sample Leads
  // const leadsData = [
  //   {
  //     name: 'James Thornton',
  //     phone: '+1 (555) 891-2345',
  //     email: 'james.thornton@example.com',
  //     source: 'Website',
  //     origin: 'JFK (New York)',
  //     destination: 'LHR (London)',
  //     travelDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
  //     returnDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
  //     pax: 2,
  //     tripType: 'Round Trip',
  //     stage: 'Quoted',
  //     assignedTo: staff1._id,
  //     paymentStatus: 'Pending',
  //     priceQuoted: 1450,
  //     currency: 'USD',
  //     nextFollowUpDate: today, // DUE TODAY
  //     notes: [
  //       {
  //         id: 'n1',
  //         text: 'Prefers British Airways or Virgin Atlantic direct flights. Sent quotation for Premium Economy.',
  //         authorName: staff1.name,
  //         authorRole: 'staff',
  //         createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  //       },
  //     ],
  //     activityLog: [
  //       {
  //         id: 'a1',
  //         type: 'lead_created',
  //         description: 'Lead created via Website and auto-assigned to Sarah Jenkins',
  //         actorName: 'System',
  //         timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  //       },
  //     ],
  //   },
  //   {
  //     name: 'Priya Patel',
  //     phone: '+1 (555) 782-9012',
  //     email: 'priya.patel@techcorp.io',
  //     source: 'Contact Us',
  //     origin: 'DEL (New Delhi)',
  //     destination: 'DXB (Dubai)',
  //     travelDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
  //     returnDate: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
  //     pax: 1,
  //     tripType: 'Round Trip',
  //     stage: 'Negotiation',
  //     assignedTo: staff2._id,
  //     paymentStatus: 'Pending',
  //     priceQuoted: 880,
  //     currency: 'USD',
  //     nextFollowUpDate: overdueDate, // OVERDUE
  //     notes: [
  //       {
  //         id: 'n2',
  //         text: 'Client requested a $50 discount on Emirates Business Class upgrade.',
  //         authorName: staff2.name,
  //         authorRole: 'staff',
  //         createdAt: overdueDate,
  //       },
  //     ],
  //     activityLog: [
  //       {
  //         id: 'a2',
  //         type: 'stage_changed',
  //         description: 'Stage updated from Quoted to Negotiation',
  //         actorName: staff2.name,
  //         timestamp: overdueDate,
  //       },
  //     ],
  //   },
  //   {
  //     name: 'Carlos Mendoza',
  //     phone: '+1 (555) 432-8765',
  //     email: 'carlos.mendoza@global.net',
  //     source: 'Referral',
  //     origin: 'MIA (Miami)',
  //     destination: 'MAD (Madrid)',
  //     travelDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
  //     returnDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
  //     pax: 3,
  //     tripType: 'Round Trip',
  //     stage: 'Ticketed',
  //     assignedTo: staff1._id,
  //     paymentStatus: 'Paid',
  //     pnr: 'IB7928',
  //     invoiceNumber: 'INV-2026-089',
  //     priceQuoted: 3660,
  //     currency: 'USD',
  //     nextFollowUpDate: futureDate,
  //     notes: [
  //       {
  //         id: 'n3',
  //         text: 'Full payment received via Wire Transfer. E-tickets emailed.',
  //         authorName: staff1.name,
  //         authorRole: 'staff',
  //         createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
  //       },
  //     ],
  //     activityLog: [
  //       {
  //         id: 'a3',
  //         type: 'ticketed',
  //         description: 'Ticket issued with PNR IB7928. Invoice INV-2026-089 generated.',
  //         actorName: staff1.name,
  //         timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
  //       },
  //     ],
  //   },
  //   {
  //     name: 'Sophie Laurent',
  //     phone: '+1 (555) 314-1592',
  //     email: 'sophie.laurent@paris.fr',
  //     source: 'Ads',
  //     origin: 'CDG (Paris)',
  //     destination: 'JFK (New York)',
  //     travelDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  //     pax: 1,
  //     tripType: 'One Way',
  //     stage: 'New',
  //     assignedTo: staff1._id,
  //     paymentStatus: 'Pending',
  //     priceQuoted: 620,
  //     currency: 'USD',
  //     nextFollowUpDate: today,
  //     notes: [],
  //     activityLog: [
  //       {
  //         id: 'a4',
  //         type: 'lead_created',
  //         description: 'New lead from Meta Ads campaign',
  //         actorName: 'System',
  //         timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  //       },
  //     ],
  //   },
  //   {
  //     name: 'David & Rachel Chen',
  //     phone: '+1 (555) 654-3210',
  //     email: 'david.chen@familytravel.org',
  //     source: 'Phone',
  //     origin: 'ORD (Chicago)',
  //     destination: 'HND (Tokyo)',
  //     travelDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
  //     returnDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
  //     pax: 4,
  //     tripType: 'Round Trip',
  //     stage: 'Booked',
  //     assignedTo: staff2._id,
  //     paymentStatus: 'Partial',
  //     pnr: 'JL8802',
  //     invoiceNumber: 'INV-2026-092',
  //     priceQuoted: 5400,
  //     currency: 'USD',
  //     nextFollowUpDate: futureDate,
  //     notes: [
  //       {
  //         id: 'n5',
  //         text: '50% deposit received. Balance due 2 weeks before flight departure.',
  //         authorName: staff2.name,
  //         authorRole: 'staff',
  //         createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
  //       },
  //     ],
  //     activityLog: [],
  //   },
  //   {
  //     name: 'Liam O’Connor',
  //     phone: '+1 (555) 908-1122',
  //     email: 'liam.oconnor@dublin.ie',
  //     source: 'Newsletter',
  //     origin: 'DUB (Dublin)',
  //     destination: 'SFO (San Francisco)',
  //     travelDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
  //     pax: 1,
  //     tripType: 'One Way',
  //     stage: 'Contacted',
  //     assignedTo: null, // Unassigned for Admin testing
  //     paymentStatus: 'Pending',
  //     priceQuoted: 790,
  //     currency: 'USD',
  //     nextFollowUpDate: today,
  //     notes: [],
  //     activityLog: [
  //       {
  //         id: 'a6',
  //         type: 'lead_created',
  //         description: 'Lead submitted inquiry from newsletter campaign',
  //         actorName: 'System',
  //         timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
  //       },
  //     ],
  //   },
  //   {
  //     name: 'Aisha Al-Maktoum',
  //     phone: '+1 (555) 123-9988',
  //     email: 'aisha.m@gulfcorp.ae',
  //     source: 'Contact Us',
  //     origin: 'DXB (Dubai)',
  //     destination: 'BOM (Mumbai)',
  //     travelDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
  //     pax: 2,
  //     tripType: 'Round Trip',
  //     stage: 'Lost',
  //     assignedTo: staff1._id,
  //     paymentStatus: 'Pending',
  //     priceQuoted: 650,
  //     currency: 'USD',
  //     notes: [
  //       {
  //         id: 'n7',
  //         text: 'Client opted to redeem airline miles directly.',
  //         authorName: staff1.name,
  //         authorRole: 'staff',
  //         createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
  //       },
  //     ],
  //     activityLog: [],
  //   },
  // ];

  // const createdLeads = await Lead.create(leadsData);

  // 5. Create Sample Tasks with Staff Assignment
  // await Task.create([
  //   {
  //     title: 'Call James Thornton regarding BA vs Virgin quotes',
  //     description: 'Confirm seat preference in Premium Economy and send payment link.',
  //     leadId: createdLeads[0]._id,
  //     assignedTo: staff1._id,
  //     priority: 'High',
  //     dueDate: today,
  //     status: 'Pending',
  //     sendEmailAlert: true,
  //   },
  //   {
  //     title: 'Follow up on Dubai business class upgrade with Priya',
  //     description: 'Check manager approval for $50 discount.',
  //     leadId: createdLeads[1]._id,
  //     assignedTo: staff2._id,
  //     priority: 'High',
  //     dueDate: overdueDate,
  //     status: 'In Progress',
  //     sendEmailAlert: true,
  //   },
  //   {
  //     title: 'Collect final balance for Chen family Tokyo trip',
  //     description: 'Invoice INV-2026-092 pending second installment.',
  //     leadId: createdLeads[4]._id,
  //     assignedTo: staff2._id,
  //     priority: 'Medium',
  //     dueDate: futureDate,
  //     status: 'Pending',
  //     sendEmailAlert: false,
  //   },
  //   {
  //     title: 'Review weekly flight supplier deals',
  //     description: 'Check negotiated corporate fares for North America routes.',
  //     assignedTo: admin._id,
  //     priority: 'Low',
  //     dueDate: futureDate,
  //     status: 'Pending',
  //     sendEmailAlert: false,
  //   },
  // ]);

  console.log('✅ Database successfully seeded!');
  return { success: true, message: 'Database seeded successfully' };
}
