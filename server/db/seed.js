import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { seedSampleData } from '../services/seed.service.js';
if (process.env.NODE_ENV === 'production')
  throw new Error('The sample seeder is for development databases only');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env first');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  const seeded = await seedSampleData(pool, { password: process.env.SEED_PASSWORD });
  console.log(
    'ClientFlow sample data ready: ' +
      seeded.accounts.length +
      ' users, ' +
      seeded.projects +
      ' projects, ' +
      seeded.tasks +
      ' tasks. See docs/seeding.md for accounts. Existing records were preserved.',
  );
} finally {
  await pool.end();
}
