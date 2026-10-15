import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../../server/app.js';
import { seedSampleData } from '../../server/services/seed.service.js';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL for Playwright tests');
const database = 'clientflow_e2e_' + randomBytes(6).toString('hex');
const statePath = path.resolve('.cache/e2e-state.json');
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let created = false,
  pool,
  server,
  cleaning = false;
async function cleanup() {
  if (cleaning) return;
  cleaning = true;
  if (server) await new Promise((r) => server.close(r));
  if (pool) await pool.end();
  if (created) await admin.query('DROP DATABASE ' + database);
  await admin.end();
  await unlink(statePath).catch(() => {});
}
try {
  await admin.query('CREATE DATABASE ' + database);
  created = true;
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify({ database }));
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/' + database;
  pool = new pg.Pool({ connectionString: url.toString() });
  await pool.query(await readFile(path.resolve('server/db/schema.sql'), 'utf8'));
  process.env.APP_ORIGIN = 'http://127.0.0.1:3010';
  process.env.NODE_ENV = 'test';
  let ready = false;
  const app = createApp(pool, { serveStatic: false });
  app.get('/__e2e/ready', (req, res) => res.status(ready ? 200 : 503).json({ ready }));
  app.post('/__e2e/cleanup', (req, res) => {
    res.json({ ok: true });
    cleanup()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e.message);
        process.exit(1);
      });
  });
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (req, res) => res.sendFile(path.resolve('dist/index.html')));
  server = app.listen(3010, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  await seedSampleData(pool);
  ready = true;
  console.log('Playwright test workspace ready');
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => cleanup().then(() => process.exit(0)));
} catch (e) {
  await cleanup();
  throw e;
}
