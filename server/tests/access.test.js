import pg from 'pg';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { readFile } from 'node:fs/promises';
import { createApp } from '../app.js';
import { canAccessProject, canAccessTask, canManage, canWrite } from '../services/auth.service.js';

test('permission matrix denies unknown roles and isolates private projects', () => {
  const team = { visibility: 'team' },
    privateProject = { visibility: 'private' };
  assert.equal(canAccessProject(undefined, team, false), false);
  for (const role of ['owner', 'admin']) {
    assert.ok(canManage(role));
    assert.ok(canAccessProject(role, privateProject, false));
  }
  assert.ok(canWrite('member'));
  assert.equal(canWrite('client'), false);
  assert.equal(canWrite('viewer'), false);
  assert.equal(canAccessProject('client', team, false), false);
  assert.ok(canAccessProject('client', team, true));
  assert.equal(canAccessProject('member', privateProject, false), false);
  assert.ok(canAccessProject('member', privateProject, true));
  assert.equal(canAccessTask('client', { visibility: 'internal' }), false);
  assert.ok(canAccessTask('client', { visibility: 'client' }));
});

test('API enforces invitations, tenant isolation, client task visibility and viewer writes', async () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = process.env.TEST_DATABASE_URL
    ? new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
    : new Pool();
  await pool.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  const server = createApp(pool, { serveStatic: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  async function request(path, method = 'GET', body, cookie) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get('set-cookie')?.split(';')[0],
    };
  }
  const register = async (email) =>
    request('/auth/register', 'POST', {
      name: email.split('@')[0],
      email,
      password: 'A sufficiently long password',
      agency: 'Test agency',
    });
  try {
    assert.equal((await request('/bootstrap')).status, 401);
    const owner = await register('owner@example.com'),
      client = await register('client@example.com'),
      outsider = await register('other@example.com'),
      viewer = await register('viewer@example.com');
    assert.equal(owner.status, 201);
    const ownerData = (await request('/bootstrap', 'GET', null, owner.cookie)).data;
    const workspace = ownerData.workspaces.find((w) => w.kind === 'agency');
    const personal = ownerData.workspaces.find((w) => w.kind === 'personal');
    assert.ok(personal);
    assert.equal(ownerData.workspaces.length, 2);
    const project = (
      await request(
        '/projects',
        'POST',
        { workspace_id: workspace.id, name: 'Client Acme', visibility: 'private' },
        owner.cookie,
      )
    ).data;
    const otherProject = (
      await request(
        '/projects',
        'POST',
        { workspace_id: workspace.id, name: 'Another client', visibility: 'team' },
        owner.cookie,
      )
    ).data;
    const internal = await request(
      '/tasks',
      'POST',
      { project_id: project.id, title: 'Internal budget', visibility: 'internal' },
      owner.cookie,
    );
    const shared = await request(
      '/tasks',
      'POST',
      { project_id: project.id, title: 'Shared design', visibility: 'client' },
      owner.cookie,
    );
    assert.equal(shared.status, 201);
    const invitation = await request(
      '/invitations',
      'POST',
      {
        workspace_id: workspace.id,
        email: 'client@example.com',
        role: 'client',
        project_id: project.id,
      },
      owner.cookie,
    );
    assert.equal(invitation.status, 201);
    assert.equal(
      (
        await request(
          '/invitations/accept',
          'POST',
          { token: invitation.data.token },
          outsider.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          '/invitations/accept',
          'POST',
          { token: invitation.data.token },
          client.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          '/invitations/accept',
          'POST',
          { token: invitation.data.token },
          client.cookie,
        )
      ).status,
      404,
    );
    const checklist = [{ id: 'check-1', title: 'Review layout', done: true }];
    assert.equal(
      (await request('/tasks/' + shared.data.id, 'PATCH', { subtasks: checklist }, owner.cookie))
        .status,
      200,
    );
    assert.equal(
      (await request('/tasks/' + shared.data.id, 'PATCH', { subtasks: [] }, client.cookie)).status,
      403,
    );
    const clientData = (await request('/bootstrap', 'GET', null, client.cookie)).data;
    assert.deepEqual(clientData.tasks.find((t) => t.id === shared.data.id).subtasks, checklist);
    assert.ok(clientData.projects.some((p) => p.id === project.id));
    assert.equal(
      clientData.projects.some((p) => p.id === otherProject.id),
      false,
    );
    assert.equal(
      clientData.workspaces.some((w) => w.id === personal.id),
      false,
    );
    assert.ok(clientData.tasks.some((t) => t.id === shared.data.id));
    assert.equal(
      clientData.tasks.some((t) => t.id === internal.data.id),
      false,
    );
    assert.equal(
      (
        await request(
          '/tasks/' + internal.data.id + '/comments',
          'POST',
          { body: 'Should fail' },
          client.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (await request('/tasks/' + shared.data.id, 'PATCH', { status: 'Done' }, client.cookie))
        .status,
      403,
    );
    assert.equal(
      (
        await request(
          '/tasks/' + shared.data.id + '/comments',
          'POST',
          { body: 'Looks good!' },
          client.cookie,
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await request(
          '/tasks',
          'POST',
          { project_id: project.id, title: 'Unauthorized' },
          outsider.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          '/tasks/' + shared.data.id,
          'PATCH',
          { status: 'Invented status' },
          owner.cookie,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          '/invitations',
          'POST',
          { workspace_id: personal.id, email: 'viewer@example.com', role: 'viewer' },
          owner.cookie,
        )
      ).status,
      403,
    );
    const vi = await request(
      '/invitations',
      'POST',
      {
        workspace_id: workspace.id,
        email: 'viewer@example.com',
        role: 'viewer',
        project_id: project.id,
      },
      owner.cookie,
    );
    await request('/invitations/accept', 'POST', { token: vi.data.token }, viewer.cookie);
    assert.equal(
      (
        await request(
          '/tasks/' + shared.data.id + '/comments',
          'POST',
          { body: 'Forbidden' },
          viewer.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          '/tasks',
          'POST',
          { project_id: project.id, title: 'Forbidden' },
          viewer.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          '/members/' + workspace.id + '/' + owner.data.id,
          'PATCH',
          { role: 'viewer' },
          owner.cookie,
        )
      ).status,
      403,
    );
    assert.equal((await request('/auth/logout', 'POST', {}, owner.cookie)).status, 200);
    assert.equal((await request('/bootstrap', 'GET', null, owner.cookie)).status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
