import { hashPassword } from './auth.service.js';
import { withTransaction } from '../db/transaction.js';
export const sampleAccounts = [
  { id: 'owner', name: 'Maya Chen', email: 'owner@clientflow.test', role: 'owner' },
  { id: 'admin', name: 'Priya Shah', email: 'admin@clientflow.test', role: 'admin' },
  { id: 'member', name: 'Alex Morgan', email: 'member@clientflow.test', role: 'member' },
  { id: 'viewer', name: 'Sam Rivera', email: 'viewer@clientflow.test', role: 'viewer' },
  { id: 'acme', name: 'Jordan Lee', email: 'client.acme@clientflow.test', role: 'client' },
  { id: 'orbit', name: 'Taylor Park', email: 'client.orbit@clientflow.test', role: 'client' },
];
export const defaultSeedPassword = 'ClientFlowDemo2026!';
const sid = (value) => 'clientflow-seed-' + value;
function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}
export async function seedSampleData(pool, { password = defaultSeedPassword } = {}) {
  if (password.length < 12) throw new Error('SEED_PASSWORD must contain at least 12 characters');
  const hashes = new Map();
  for (const account of sampleAccounts) hashes.set(account.id, await hashPassword(password));
  const projects = [
    {
      id: 'brand',
      name: 'Brand & website',
      client: 'Acme',
      visibility: 'team',
      color: '#6c5ce7',
      members: ['owner', 'admin', 'member', 'acme'],
    },
    {
      id: 'campaign',
      name: 'Fall campaign',
      client: 'Orbit',
      visibility: 'team',
      color: '#e79650',
      members: ['owner', 'admin', 'member', 'orbit'],
    },
    {
      id: 'launch',
      name: 'Product launch',
      client: 'Lumina',
      visibility: 'private',
      color: '#43977b',
      members: ['owner', 'admin', 'member'],
    },
    {
      id: 'operations',
      name: 'Studio operations',
      client: 'Internal',
      visibility: 'private',
      color: '#a8759e',
      members: ['owner', 'admin'],
    },
    {
      id: 'social',
      name: 'Social content',
      client: 'Acme',
      visibility: 'private',
      color: '#7099bd',
      members: ['owner', 'admin', 'member', 'acme'],
    },
    {
      id: 'atlas',
      name: 'Website redesign',
      client: 'Atlas',
      visibility: 'team',
      color: '#94a267',
      workspace: 'north',
      members: ['owner', 'admin'],
    },
  ];
  await withTransaction(pool, async (db) => {
    for (const a of sampleAccounts) {
      const collision = await db.query('SELECT id FROM users WHERE email=$1', [a.email]);
      if (collision.rows.length && collision.rows[0].id !== sid(a.id))
        throw new Error('Seed email already belongs to a non-seed account: ' + a.email);
      await db.query(
        'INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
        [sid(a.id), a.name, a.email, hashes.get(a.id)],
      );
    }
    for (const [key, name] of [
      ['forma', 'Forma Studio'],
      ['north', 'North Studio'],
    ]) {
      await db.query(
        'INSERT INTO workspaces(id,name,kind,owner_id) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
        [sid(key), name, 'agency', sid('owner')],
      );
    }
    for (const a of sampleAccounts) {
      await db.query(
        'INSERT INTO memberships(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(workspace_id,user_id) DO NOTHING',
        [sid('forma'), sid(a.id), a.role],
      );
      const personal = sid('personal-' + a.id);
      await db.query(
        'INSERT INTO workspaces(id,name,kind,owner_id) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
        [personal, 'Personal workspace', 'personal', sid(a.id)],
      );
      await db.query(
        'INSERT INTO memberships(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(workspace_id,user_id) DO NOTHING',
        [personal, sid(a.id), 'owner'],
      );
      await db.query(
        'INSERT INTO projects(id,workspace_id,name,client,description,color,visibility) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING',
        [
          sid('personal-project-' + a.id),
          personal,
          'My plans',
          '',
          'A private space for your ideas.',
          '#6c5ce7',
          'private',
        ],
      );
      await db.query(
        'INSERT INTO tasks(id,project_id,title,description,status,priority,assignee_id,visibility,label) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING',
        [
          sid('personal-task-' + a.id),
          sid('personal-project-' + a.id),
          'Plan the week',
          'Prioritize your next steps.',
          'To do',
          'Low',
          sid(a.id),
          'internal',
          'Personal',
        ],
      );
    }
    for (const id of ['owner', 'admin'])
      await db.query(
        'INSERT INTO memberships(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(workspace_id,user_id) DO NOTHING',
        [sid('north'), sid(id), id === 'owner' ? 'owner' : 'admin'],
      );
    for (const p of projects) {
      await db.query(
        'INSERT INTO projects(id,workspace_id,name,client,description,color,visibility,due_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING',
        [
          sid(p.id),
          sid(p.workspace || 'forma'),
          p.name,
          p.client,
          'A focused project for ' + p.client + '.',
          p.color,
          p.visibility,
          day(21),
        ],
      );
      for (const account of p.members)
        await db.query(
          'INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT(project_id,user_id) DO NOTHING',
          [sid(p.id), sid(account)],
        );
    }
    const brandTasks = [
      ['Explore visual directions', 'Backlog', 'internal', 'owner', 'Branding'],
      ['Audit the current website', 'Backlog', 'internal', 'member', 'Research'],
      ['Map the customer journey', 'To do', 'internal', 'member', 'Strategy'],
      ['Write homepage copy', 'To do', 'client', 'owner', 'Content'],
      ['Design the homepage', 'In progress', 'client', 'owner', 'Design'],
      ['Build the component library', 'In progress', 'internal', 'member', 'Development'],
      ['Review the brand concept', 'In review', 'client', 'acme', 'Client review'],
      ['Approve the sitemap', 'Done', 'client', 'acme', 'Strategy'],
      ['Kickoff and discovery', 'Done', 'client', 'owner', 'Planning'],
    ];
    for (let i = 0; i < 36; i++) {
      const base = brandTasks[i % brandTasks.length];
      const [title, status, visibility, assignee, label] = base;
      const taskId = sid('brand-task-' + i);
      await db.query(
        'INSERT INTO tasks(id,project_id,title,description,status,priority,assignee_id,due_date,visibility,label,subtasks) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING',
        [
          taskId,
          sid('brand'),
          i < brandTasks.length
            ? title
            : title + ' · phase ' + (Math.floor(i / brandTasks.length) + 1),
          'Review the brief, collaborate with the team, and deliver the agreed outcome. This is sample development data.',
          status,
          ['High', 'Medium', 'Low'][i % 3],
          sid(assignee),
          day((i % 8) + 1),
          visibility,
          label,
          JSON.stringify([
            { id: 'check-' + i + '-1', title: 'Confirm requirements', done: true },
            { id: 'check-' + i + '-2', title: 'Review final details', done: status === 'Done' },
          ]),
        ],
      );
    }
    for (const p of projects.filter((p) => p.id !== 'brand')) {
      for (let i = 0; i < 5; i++) {
        const client = p.id === 'campaign' ? 'orbit' : p.id === 'social' ? 'acme' : null;
        await db.query(
          'INSERT INTO tasks(id,project_id,title,description,status,priority,assignee_id,due_date,visibility,label) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING',
          [
            sid(p.id + '-task-' + i),
            sid(p.id),
            [
              'Confirm the brief',
              'Prepare creative assets',
              'Review the proposal',
              'Share client feedback',
              'Final delivery',
            ][i],
            'Sample work for ' + p.client + '.',
            ['To do', 'In progress', 'In review', 'To do', 'Done'][i],
            'Medium',
            sid(client && i === 3 ? client : 'owner'),
            day(i + 2),
            client ? 'client' : 'internal',
            i === 1 ? 'Design' : 'Planning',
          ],
        );
      }
    }
    await db.query(
      'INSERT INTO comments(id,task_id,user_id,body) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
      [
        sid('comment-brand'),
        sid('brand-task-6'),
        sid('owner'),
        'The first concept is ready for your feedback.',
      ],
    );
    for (const [i, message] of [
      'Created the brand workspace',
      'Moved Design the homepage to In progress',
      'Shared the brand concept for review',
      'Completed the sitemap review',
    ].entries())
      await db.query(
        'INSERT INTO activity(id,workspace_id,project_id,user_id,message,visibility) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',
        [
          sid('activity-' + i),
          sid('forma'),
          sid('brand'),
          sid(i === 3 ? 'acme' : 'owner'),
          message,
          i === 0 ? 'internal' : 'client',
        ],
      );
  });
  return {
    workspaceId: sid('forma'),
    accounts: sampleAccounts.map((a) => ({ ...a, id: sid(a.id) })),
    projects: projects.length + sampleAccounts.length,
    tasks: 36 + (projects.length - 1) * 5 + sampleAccounts.length,
  };
}
