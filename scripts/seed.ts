import 'dotenv/config';
import { seedDatabase } from '../lib/seed';

async function main() {
  const force = process.argv.includes('--force');
  const mode = force ? ' (FORCE — wipes existing data)' : '';
  console.log('\n🌱  Seeding database' + mode + '...\n');

  try {
    const result = await seedDatabase(force);
    console.log('\n✅  ' + result.message);
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌  Seed failed: ' + err.message);
    process.exit(1);
  }
}

main();
