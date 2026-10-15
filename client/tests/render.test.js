import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
test('frontend pages render correctly for each access level', async (t) => {
  const previous = globalThis.location;
  globalThis.location = { search: '' };
  const vite = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [],
    esbuild: { jsx: 'automatic' },
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  });
  try {
    const load = async (file) => (await vite.ssrLoadModule('/client/src/' + file)).default;
    const Overview = await load('features/workspace/Overview.jsx'),
      Settings = await load('features/workspace/SettingsPage.jsx'),
      Details = await load('features/tasks/TaskDetails.jsx'),
      Members = await load('features/members/Members.jsx');
    const user = { id: 'owner', name: 'Maya Chen', email: 'owner@example.test' },
      ws = { id: 'w', name: 'Studio', kind: 'agency', role: 'owner' },
      project = {
        id: 'p',
        workspace_id: 'w',
        name: 'Delivery',
        client: 'Acme',
        member_ids: ['owner'],
        color: '#36795a',
        visibility: 'team',
      },
      task = {
        id: 'task',
        project_id: 'p',
        title: 'Design homepage',
        description: 'Prepare the final layout',
        status: 'In progress',
        priority: 'High',
        visibility: 'client',
        assignee_id: 'owner',
        revision: 1,
        comments: [],
        subtasks: [
          { id: 'one', title: 'Confirm layout', done: true },
          { id: 'two', title: 'Review design', done: false },
        ],
      };
    const noop = () => {};
    const data = {
      user,
      workspaces: [ws],
      projects: [project],
      archivedProjects: [],
      tasks: [task],
      members: [{ ...user, workspace_id: 'w', role: 'owner' }],
      activity: [],
      invitations: [],
    };
    const model = {
      data,
      ws,
      wid: 'w',
      projects: [project],
      taskList: [task],
      doneTasks: [],
      members: data.members,
      role: 'owner',
      manage: true,
      write: true,
      setModal: noop,
      setPage: noop,
      setPid: noop,
      openTask: noop,
      query: '',
      mutate: noop,
      demoLog: noop,
    };
    await t.test('overview reports actual task counts', () => {
      const html = renderToStaticMarkup(React.createElement(Overview, { model }));
      assert.match(html, /Hello, Maya/);
      assert.match(html, /Completed tasks/);
      assert.match(html, /In progress/);
      assert.match(html, /Design homepage/);
      assert.match(html, /Upcoming workload/);
    });
    await t.test('owner settings expose management and restore actions', () => {
      const html = renderToStaticMarkup(
        React.createElement(Settings, {
          model: {
            ...model,
            data: {
              ...data,
              archivedProjects: [
                { ...project, id: 'archived', archived_at: new Date().toISOString() },
              ],
            },
          },
        }),
      );
      assert.match(html, /Rename workspace/);
      assert.match(html, /Project management/);
      assert.match(html, /Archive/);
      assert.match(html, /Restore/);
    });
    await t.test('clients cannot see management buttons in settings or members', () => {
      const clientModel = { ...model, role: 'client', manage: false, write: false };
      const html =
        renderToStaticMarkup(React.createElement(Settings, { model: clientModel })) +
        renderToStaticMarkup(React.createElement(Members, { model: clientModel }));
      assert.doesNotMatch(
        html,
        /Rename workspace|Project management|Create workspace|Invite a person|Manage access/,
      );
    });
    await t.test('read-only task detail shows progress without edit controls', () => {
      const html = renderToStaticMarkup(
        React.createElement(Details, {
          task,
          projects: [project],
          members: data.members,
          canWrite: false,
          canComment: true,
          onClose: noop,
          onSave: noop,
          onDelete: noop,
          onComment: noop,
          activity: [],
        }),
      );
      assert.match(html, /Design homepage/);
      assert.match(html, /50%/);
      assert.match(html, /Confirm layout/);
      assert.doesNotMatch(html, /Save changes|New subtask|Delete task/);
      assert.match(html, /disabled/);
    });
  } finally {
    await vite.close();
    globalThis.location = previous;
  }
});
