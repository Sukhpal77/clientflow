import 'dotenv/config';
import pg from 'pg';
import { createApp } from './app.js';
import { readFile } from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(await readFile(new URL('./db/schema.sql', import.meta.url), 'utf8'));
const app = createApp(pool);
const server = app.listen(process.env.PORT || 3001, () =>
  console.log('ClientFlow running at http://localhost:' + (process.env.PORT || 3001)),
);

for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
