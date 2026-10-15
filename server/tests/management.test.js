import test from 'node:test';
import assert from 'node:assert/strict';
import { testApp } from './helpers/test-app.js';
import { hashToken } from '../services/auth.service.js';
test('complete management workflows and authorization boundaries', async (t) => {
  const f = await testApp(),
    { pool, request, register } = f;
  try {
    const owner = await register('Owner'),
      member = await register('Member'),
      admin = await register('Admin'),
      client = await register('Client'),
      outsider = await register('Outsider');
    const bootstrap = async (person) =>
      (await request('/bootstrap', 'GET', null, person.cookie)).data;
    const ws = (await bootstrap(owner)).workspaces.find((w) => w.kind === 'agency');
    const project = (
      await request(
        '/projects',
        'POST',
        { workspace_id: ws.id, name: 'Delivery project', visibility: 'private' },
        owner.cookie,
      )
    ).data;
    async function invite(person, role, projectId) {
      const i = await request(
        '/invitations',
        'POST',
        { workspace_id: ws.id, email: person.email, role, project_id: projectId || null },
        owner.cookie,
      );
      assert.equal(i.status, 201);
      const accepted = await request(
        '/invitations/accept',
        'POST',
        { token: i.data.token },
        person.cookie,
      );
      assert.equal(accepted.status, 200);
      assert.equal(accepted.data.workspace_id, ws.id);
      return i;
    }
    await invite(member, 'member');
    await invite(admin, 'admin');
    await invite(client, 'client', project.id);
    await t.test('registration, login, session privacy and duplicate accounts', async () => {
      assert.equal(owner.status, 201);
      assert.match(owner.setCookie, /HttpOnly/);
      assert.match(owner.setCookie, /SameSite=Lax/);
      assert.equal(
        (
          await request('/auth/login', 'POST', {
            email: owner.email.toUpperCase(),
            password: 'Verification password 2026',
          })
        ).status,
        200,
      );
      assert.equal(
        (await request('/auth/login', 'POST', { email: owner.email, password: 'wrong' })).status,
        401,
      );
      assert.equal(
        (
          await request('/auth/register', 'POST', {
            name: 'Again',
            email: owner.email,
            password: 'Verification password 2026',
          })
        ).status,
        409,
      );
      const data = await bootstrap(owner);
      assert.equal(data.user.password_hash, undefined);
      assert.equal(data.workspaces.length, 2);
    });
    await t.test('workspace creation and rename are permission checked', async () => {
      assert.equal(
        (await request('/workspaces/' + ws.id, 'PATCH', { name: 'Renamed studio' }, owner.cookie))
          .status,
        200,
      );
      assert.equal(
        (await bootstrap(owner)).workspaces.find((w) => w.id === ws.id).name,
        'Renamed studio',
      );
      assert.equal(
        (await request('/workspaces/' + ws.id, 'PATCH', { name: 'Forbidden' }, member.cookie))
          .status,
        403,
      );
      const created = await request('/workspaces', 'POST', { name: 'Second agency' }, owner.cookie);
      assert.equal(created.status, 201);
      assert.equal(
        (await bootstrap(owner)).workspaces.find((w) => w.id === created.data.id).role,
        'owner',
      );
    });
    await t.test('project details edit, tenant protection and private membership', async () => {
      assert.equal(
        (
          await request(
            '/projects/' + project.id,
            'PATCH',
            { name: 'Updated delivery', due_date: '2026-11-20' },
            admin.cookie,
          )
        ).status,
        200,
      );
      assert.equal(
        (await request('/projects/' + project.id, 'PATCH', { name: 'Forbidden' }, member.cookie))
          .status,
        403,
      );
      assert.equal(
        (await request('/projects/' + project.id, 'PATCH', { name: 'Forbidden' }, outsider.cookie))
          .status,
        403,
      );
      assert.equal(
        (await bootstrap(member)).projects.some((p) => p.id === project.id),
        false,
      );
      assert.equal(
        (
          await request(
            '/projects/' + project.id + '/members/' + member.data.id,
            'PUT',
            {},
            owner.cookie,
          )
        ).status,
        200,
      );
      assert.equal(
        (await bootstrap(member)).projects.some((p) => p.id === project.id),
        true,
      );
    });
    const task = (
      await request(
        '/tasks',
        'POST',
        {
          project_id: project.id,
          title: 'Agency delivery',
          assignee_id: member.data.id,
          visibility: 'client',
          priority: 'High',
        },
        member.cookie,
      )
    ).data;
    await t.test('task revisions reject stale writes and deletes', async () => {
      const snapshot = (await bootstrap(member)).tasks.find((x) => x.id === task.id);
      assert.equal(snapshot.revision, 1);
      assert.equal(
        (
          await request(
            '/tasks/' + task.id,
            'PATCH',
            { title: 'First edit', revision: 1 },
            member.cookie,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            '/tasks/' + task.id,
            'PATCH',
            { title: 'Stale edit', revision: 1 },
            owner.cookie,
          )
        ).status,
        409,
      );
      assert.equal(
        (await request('/tasks/' + task.id, 'DELETE', { revision: 1 }, owner.cookie)).status,
        409,
      );
      const current = (await bootstrap(member)).tasks.find((x) => x.id === task.id);
      assert.equal(current.title, 'First edit');
      assert.equal(current.priority, 'High');
      assert.equal(current.visibility, 'client');
      assert.equal(current.revision, 2);
      assert.equal(
        (await request('/tasks/' + task.id, 'PATCH', { revision: 2 }, owner.cookie)).status,
        400,
      );
      assert.equal(
        (await request('/tasks/' + task.id, 'PATCH', { due_date: '2026-02-30' }, owner.cookie))
          .status,
        400,
      );
    });
    await t.test('clients see assignee names without unrelated member emails', async () => {
      const data = await bootstrap(client),
        assignee = data.members.find((m) => m.workspace_id === ws.id && m.id === member.data.id);
      assert.ok(assignee);
      assert.equal(assignee.name, 'Member');
      assert.equal(assignee.email, '');
      assert.equal(
        data.members.some((m) => m.workspace_id === ws.id && m.id === admin.data.id),
        false,
      );
    });
    await t.test('archiving preserves tasks, freezes writes and supports restore', async () => {
      assert.equal(
        (await request('/projects/' + project.id + '/archive', 'POST', {}, member.cookie)).status,
        403,
      );
      assert.equal(
        (await request('/projects/' + project.id + '/archive', 'POST', {}, admin.cookie)).status,
        200,
      );
      assert.equal(
        (await bootstrap(member)).projects.some((p) => p.id === project.id),
        false,
      );
      assert.equal(
        (await bootstrap(owner)).archivedProjects.some((p) => p.id === project.id),
        true,
      );
      assert.equal(
        (await request('/tasks/' + task.id, 'PATCH', { status: 'Done' }, owner.cookie)).status,
        409,
      );
      assert.equal(
        (
          await request(
            '/tasks/' + task.id + '/comments',
            'POST',
            { body: 'Archived comment' },
            client.cookie,
          )
        ).status,
        409,
      );
      assert.equal(
        (await request('/projects/' + project.id + '/restore', 'POST', {}, owner.cookie)).status,
        200,
      );
      assert.ok((await bootstrap(member)).tasks.some((x) => x.id === task.id));
    });
    await t.test('expired/revoked invitations fail and admins cannot promote admins', async () => {
      assert.equal(
        (
          await request(
            '/invitations',
            'POST',
            { workspace_id: ws.id, email: outsider.email, role: 'admin' },
            admin.cookie,
          )
        ).status,
        403,
      );
      const expired = await request(
        '/invitations',
        'POST',
        { workspace_id: ws.id, email: outsider.email, role: 'viewer' },
        owner.cookie,
      );
      await pool.query('UPDATE invitations SET expires_at=$1 WHERE token_hash=$2', [
        new Date(Date.now() - 60000),
        hashToken(expired.data.token),
      ]);
      assert.equal(
        (
          await request(
            '/invitations/accept',
            'POST',
            { token: expired.data.token },
            outsider.cookie,
          )
        ).status,
        404,
      );
      const revoked = await request(
        '/invitations',
        'POST',
        { workspace_id: ws.id, email: outsider.email, role: 'viewer' },
        owner.cookie,
      );
      const pending = (await bootstrap(owner)).invitations.find((i) => i.email === outsider.email);
      assert.equal(
        (await request('/invitations/' + pending.id, 'DELETE', null, member.cookie)).status,
        403,
      );
      assert.equal(
        (await request('/invitations/' + pending.id, 'DELETE', null, owner.cookie)).status,
        200,
      );
      assert.equal(
        (
          await request(
            '/invitations/accept',
            'POST',
            { token: revoked.data.token },
            outsider.cookie,
          )
        ).status,
        404,
      );
    });
    await t.test('removing members revokes access and unassigns their tasks', async () => {
      assert.equal(
        (await request('/members/' + ws.id + '/' + owner.data.id, 'DELETE', null, owner.cookie))
          .status,
        403,
      );
      assert.equal(
        (await request('/members/' + ws.id + '/' + admin.data.id, 'DELETE', null, admin.cookie))
          .status,
        403,
      );
      assert.equal(
        (await request('/members/' + ws.id + '/' + member.data.id, 'DELETE', null, client.cookie))
          .status,
        403,
      );
      assert.equal(
        (await request('/members/' + ws.id + '/' + member.data.id, 'DELETE', null, admin.cookie))
          .status,
        200,
      );
      assert.equal(
        (await bootstrap(member)).workspaces.some((w) => w.id === ws.id),
        false,
      );
      assert.equal(
        (await request('/tasks/' + task.id, 'PATCH', { status: 'Done' }, member.cookie)).status,
        403,
      );
      assert.equal((await bootstrap(owner)).tasks.find((x) => x.id === task.id).assignee_id, null);
      assert.equal(
        (
          await pool.query('SELECT * FROM project_members WHERE project_id=$1 AND user_id=$2', [
            project.id,
            member.data.id,
          ])
        ).rows.length,
        0,
      );
    });
    await t.test('cross-origin writes are denied', async () => {
      assert.equal(
        (
          await request('/workspaces/' + ws.id, 'PATCH', { name: 'CSRF' }, owner.cookie, {
            Origin: 'https://untrusted.example',
          })
        ).status,
        403,
      );
    });
  } finally {
    await f.close();
  }
});
