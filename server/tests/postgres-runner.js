import { readdir } from 'node:fs/promises';
import 'dotenv/config';
import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL in .env first');
const testName = 'clientflow_test_' + randomBytes(6).toString('hex');
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let created = false;
try {
  await admin.query('CREATE DATABASE ' + testName);
  created = true;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/' + testName;
  const testFiles = (await readdir('server/tests'))
    .filter((n) => n.endsWith('.test.js'))
    .map((n) => 'server/tests/' + n);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...testFiles], {
      stdio: 'inherit',
      env: { ...process.env, TEST_DATABASE_URL: url.toString() },
    });
    child.on('error', reject);
    child.on('close', resolve);
  });
  process.exitCode = code || 0;
} finally {
  if (created) await admin.query('DROP DATABASE ' + testName);
  await admin.end();
}
