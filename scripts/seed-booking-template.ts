import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../lib/db';
import { EmailTemplate } from '../models/EmailTemplate';
import { User } from '../models/User';

export async function seedBookingTemplate() {
  console.log('\n📄 Connecting to database...');
  await connectToDatabase();

  // Find an admin user or first available user to associate as creator
  const user = (await User.findOne({ role: 'admin' })) || (await User.findOne());

  const templatePath = path.join(process.cwd(), 'temp', 'booking-temp.html');
  let bodyHtml = '';

  if (fs.existsSync(templatePath)) {
    console.log(`📖 Reading template content from: ${templatePath}`);
    bodyHtml = fs.readFileSync(templatePath, 'utf-8');
  } else {
    throw new Error(`Template file not found at ${templatePath}`);
  }

  const templateData = {
    name: 'Booking Confirmation & Payment Authorization Agreement',
    category: 'Ticket Confirmation' as const,
    subject: 'Booking Confirmation & Payment Authorization Agreement — Ref {{booking_reference}}',
    bodyHtml: bodyHtml.trim(),
    createdBy: user?._id,
  };

  // Upsert template: update if already exists by name, otherwise create new
  const existing = await EmailTemplate.findOne({
    name: {
      $in: [
        'Booking Confirmation & Payment Authorization Agreement',
        'Booking Confirmation & Payment Authorization',
      ],
    },
  });

  if (existing) {
    existing.name = templateData.name;
    existing.category = templateData.category;
    existing.subject = templateData.subject;
    existing.bodyHtml = templateData.bodyHtml;
    if (user?._id) existing.createdBy = user._id;
    await existing.save();
    console.log(`\n✅ Updated existing template: "${existing.name}" (ID: ${existing._id})`);
    return { success: true, action: 'updated', template: existing };
  } else {
    const created = await EmailTemplate.create(templateData);
    console.log(`\n✅ Successfully seeded new template: "${created.name}" (ID: ${created._id})`);
    return { success: true, action: 'created', template: created };
  }
}

async function main() {
  try {
    const res = await seedBookingTemplate();
    console.log(`\n🎉 Template successfully added to MongoDB database!`);
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Seed template failed:', err.message);
    process.exit(1);
  }
}

// Run directly if called from command line
if (require.main === module) {
  main();
}
