import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
await pool.end();
console.log('Schema ready');
