import 'dotenv/config';
import { connectToDatabase } from '../lib/db';
import { Lead } from '../models/Lead';

async function run() {
  console.log('🔄 Connecting to database to backfill reference numbers...');
  await connectToDatabase();

  const leads = await Lead.find({});
  console.log(`Found ${leads.length} leads in database.`);

  let updatedCount = 0;
  for (const lead of leads) {
    let needsSave = false;
    const shortCode = lead._id.toString().slice(-6).toUpperCase();
    const ref = lead.referenceNumber || lead.invoiceNumber || `AC-${shortCode}`;

    if (!lead.referenceNumber || lead.referenceNumber !== ref) {
      lead.referenceNumber = ref;
      needsSave = true;
    }
    if (!lead.invoiceNumber || lead.invoiceNumber !== ref) {
      lead.invoiceNumber = ref;
      needsSave = true;
    }

    if (needsSave) {
      await lead.save();
      updatedCount++;
      console.log(`✅ Updated lead ${lead._id} -> Ref: ${ref}`);
    }
  }

  console.log(`🎉 Backfill completed! Updated ${updatedCount} leads.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
