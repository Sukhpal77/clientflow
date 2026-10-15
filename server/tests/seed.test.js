import test from 'node:test';
import assert from 'node:assert/strict';
import { testApp } from './helpers/test-app.js';
import { seedSampleData, defaultSeedPassword } from '../services/seed.service.js';
test('development seeder is idempotent and scopes client and personal records', async () => {
  const f = await testApp();
  try {
    await seedSampleData(f.pool);
    await f.pool.query('UPDATE tasks SET title=$1 WHERE id=$2', [
      'Edited sample task',
      'clientflow-seed-brand-task-0',
    ]);
    await seedSampleData(f.pool);
    for (const [table, count] of [
      ['users', 6],
      ['workspaces', 8],
      ['projects', 12],
      ['tasks', 67],
    ])
      assert.equal(
        Number(
          (
            await f.pool.query(
              'SELECT count(*) AS count FROM ' + table + " WHERE id LIKE 'clientflow-seed-%'",
            )
          ).rows[0].count,
        ),
        count,
      );
    assert.equal(
      (await f.pool.query('SELECT title FROM tasks WHERE id=$1', ['clientflow-seed-brand-task-0']))
        .rows[0].title,
      'Edited sample task',
    );
    for (const [email, projects] of [
      ['client.acme@clientflow.test', ['clientflow-seed-brand', 'clientflow-seed-social']],
      ['client.orbit@clientflow.test', ['clientflow-seed-campaign']],
    ]) {
      const login = await f.request('/auth/login', 'POST', {
        email,
        password: defaultSeedPassword,
      });
      assert.equal(login.status, 200);
      const data = (await f.request('/bootstrap', 'GET', null, login.cookie)).data;
      const agency = data.projects
        .filter((p) => p.workspace_id === 'clientflow-seed-forma')
        .map((p) => p.id)
        .sort();
      assert.deepEqual(agency, projects.sort());
      assert.ok(data.workspaces.some((w) => w.kind === 'personal' && w.owner_id === data.user.id));
      assert.equal(
        data.workspaces.some((w) => w.id === 'clientflow-seed-north'),
        false,
      );
      assert.ok(
        data.tasks
          .filter((t) => projects.includes(t.project_id))
          .every((t) => t.visibility === 'client'),
      );
    }
  } finally {
    await f.close();
  }
});
