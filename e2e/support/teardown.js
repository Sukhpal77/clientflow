import 'dotenv/config';
import pg from 'pg';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
export default async function teardown() {
  const statePath = path.resolve('.cache/e2e-state.json');
  await fetch('http://127.0.0.1:3010/__e2e/cleanup', { method: 'POST' }).catch(() => {});
  for (let i = 0; i < 50; i++) {
    try {
      await readFile(statePath);
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  let data;
  try {
    data = JSON.parse(await readFile(statePath, 'utf8'));
  } catch {
    return;
  }
  if (!/^clientflow_e2e_[0-9a-f]{12}$/.test(data.database))
    throw new Error('Invalid test database name; cleanup was refused');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
      [data.database],
    );
    await pool.query('DROP DATABASE IF EXISTS ' + data.database);
    await unlink(statePath).catch(() => {});
  } finally {
    await pool.end();
  }
}
