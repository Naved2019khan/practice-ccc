import 'dotenv/config';
import { connectToDatabase } from '../lib/db';
import { User } from '../models/User';

async function run() {
  console.log('🔄 Connecting to database to update user names...');
  await connectToDatabase();

  // Find admin
  const admin = await User.findOne({ role: 'admin' });
  if (admin) {
    admin.name = 'Admin';
    await admin.save();
    console.log('✅ Updated Admin user name to: Admin');
  }

  // Find staff members
  const staffMembers = await User.find({ role: 'staff' }).sort({ createdAt: 1 });
  const staffNames = ['Staff One', 'Staff Two', 'Staff Three'];

  for (let i = 0; i < staffMembers.length; i++) {
    const s = staffMembers[i];
    s.name = staffNames[i] || `Staff ${i + 1}`;
    await s.save();
    console.log(`✅ Updated Staff user ${s.email} to: ${s.name}`);
  }

  console.log('🎉 User names successfully updated in database!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
