import 'dotenv/config';
import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createApp } from '../app.js';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL');
const dbName = 'clientflow_browser_' + randomBytes(6).toString('hex');
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await admin.query('CREATE DATABASE ' + dbName);
const connection = new URL(process.env.DATABASE_URL);
connection.pathname = '/' + dbName;
const pool = new pg.Pool({ connectionString: connection.toString() });
await pool.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
process.env.APP_ORIGIN = 'http://localhost:3003';
const app = createApp(pool);
let stopping = false;
app.post('/__qa/stop', async (req, res) => {
  if (stopping) return res.status(409).json({ error: 'Already stopping' });
  stopping = true;
  res.json({ ok: true });
  server.close(async () => {
    await pool.end();
    await admin.query('DROP DATABASE ' + dbName);
    await admin.end();
    process.exit(0);
  });
});
const server = app.listen(3003, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
async function req(route, method = 'GET', body, cookie) {
  const response = await fetch('http://localhost:3003/api' + route, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const password = 'Verification password 2026';
const owner = await req('/auth/register', 'POST', {
  name: 'Maya Chen',
  agency: 'Verification Studio',
  email: 'owner@clientflow.test',
  password,
});
const collaborator = await req('/auth/register', 'POST', {
  name: 'Jordan Lee',
  agency: 'Client workspace',
  email: 'client@clientflow.test',
  password,
});
const boot = await req('/bootstrap', 'GET', null, owner.cookie);
const workspace = boot.data.workspaces.find((w) => w.kind === 'agency');
const p1 = await req(
  '/projects',
  'POST',
  {
    workspace_id: workspace.id,
    name: 'Brand & website',
    client: 'Acme',
    description: 'A fresh identity and digital home for Acme.',
    visibility: 'team',
    color: '#6c5ce7',
  },
  owner.cookie,
);
const p2 = await req(
  '/projects',
  'POST',
  {
    workspace_id: workspace.id,
    name: 'Fall campaign',
    client: 'Orbit',
    description: 'Launch planning and creative delivery.',
    visibility: 'private',
    color: '#e79650',
  },
  owner.cookie,
);
const invitation = await req(
  '/invitations',
  'POST',
  {
    workspace_id: workspace.id,
    email: 'client@clientflow.test',
    role: 'client',
    project_id: p1.data.id,
  },
  owner.cookie,
);
await req('/invitations/accept', 'POST', { token: invitation.data.token }, collaborator.cookie);
const date = new Date();
date.setDate(date.getDate() + 1);
const due = date.toISOString().slice(0, 10);
for (const [title, status, visibility, assignee, label] of [
  ['Design the homepage', 'In progress', 'client', owner.data.id, 'Design'],
  ['Review the brand concept', 'In review', 'client', collaborator.data.id, 'Client review'],
  ['Internal budget review', 'To do', 'internal', owner.data.id, 'Planning'],
  ['Kickoff and discovery', 'Done', 'client', owner.data.id, 'Strategy'],
])
  await req(
    '/tasks',
    'POST',
    {
      project_id: p1.data.id,
      title,
      status,
      visibility,
      assignee_id: assignee,
      label,
      due_date: due,
      description: 'Verification data for the complete agency workflow.',
      subtasks: [
        { id: 'step-1', title: 'Confirm requirements', done: true },
        { id: 'step-2', title: 'Review final details', done: false },
      ],
    },
    owner.cookie,
  );
console.log('Isolated ClientFlow QA ready at http://localhost:3003');
