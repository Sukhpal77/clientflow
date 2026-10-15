import { z } from 'zod';
import { id, text, taskSchema, taskPatchSchema, fail } from '../validation/schemas.js';
import { canWrite } from '../services/auth.service.js';
export function tasksRoutes(app, ctx) {
  const { pool, q, one, session, roleFor, accessProject, accessTask, log } = ctx;
  app.post('/api/tasks', async (req, res, next) => {
    try {
      const b = taskSchema.extend({ project_id: text }).parse(req.body);
      const { project, role } = await accessProject(b.project_id, req.user.id);
      if (!canWrite(role)) fail(403, 'This role cannot create tasks');
      if (b.assignee_id) await accessProject(b.project_id, b.assignee_id);
      const tid = id();
      await q(
        'INSERT INTO tasks(id,project_id,title,description,status,priority,assignee_id,due_date,visibility,label,subtasks) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [
          tid,
          b.project_id,
          b.title,
          b.description,
          b.status,
          b.priority,
          b.assignee_id,
          b.due_date || null,
          b.visibility,
          b.label,
          JSON.stringify(b.subtasks),
        ],
      );
      await log(
        project.workspace_id,
        project.id,
        req.user.id,
        'Created task ' + b.title,
        b.visibility,
      );
      res.status(201).json({ id: tid });
    } catch (e) {
      next(e);
    }
  });
  app.patch('/api/tasks/:id', async (req, res, next) => {
    try {
      const { task, project, role } = await accessTask(req.params.id, req.user.id);
      if (!canWrite(role)) fail(403, 'This role cannot edit tasks');
      const b = taskPatchSchema.parse(req.body);
      if (Object.keys(b).filter((key) => key !== 'revision').length === 0)
        fail(400, 'No task fields supplied');
      if (b.assignee_id) await accessProject(project.id, b.assignee_id);
      const next = { ...task, ...b };
      const changed = await q(
        'UPDATE tasks SET title=$1,description=$2,status=$3,priority=$4,assignee_id=$5,due_date=$6,visibility=$7,label=$8,subtasks=$9,revision=revision+1,updated_at=now() WHERE id=$10 AND revision=$11 RETURNING id,revision',
        [
          next.title,
          next.description,
          next.status,
          next.priority,
          next.assignee_id,
          next.due_date || null,
          next.visibility,
          next.label,
          JSON.stringify(next.subtasks || []),
          task.id,
          b.revision || task.revision,
        ],
      );
      if (!changed.length)
        fail(409, 'This task changed since you opened it. Close and reopen it before saving.');
      await log(
        project.workspace_id,
        project.id,
        req.user.id,
        'Updated ' + next.title + ' · ' + next.status,
        next.visibility,
      );
      res.json({ ok: true, revision: changed[0].revision });
    } catch (e) {
      next(e);
    }
  });
  app.delete('/api/tasks/:id', async (req, res, next) => {
    try {
      const { task, project, role } = await accessTask(req.params.id, req.user.id);
      if (!canWrite(role)) fail(403, 'This role cannot delete tasks');
      const expected = z.number().int().positive().optional().parse(req.body?.revision);
      const deleted = await q('DELETE FROM tasks WHERE id=$1 AND revision=$2 RETURNING id', [
        task.id,
        expected || task.revision,
      ]);
      if (!deleted.length) fail(409, 'This task changed. Reopen it before deleting.');
      await log(
        project.workspace_id,
        project.id,
        req.user.id,
        'Deleted task ' + task.title,
        task.visibility,
      );
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/tasks/:id/comments', async (req, res, next) => {
    try {
      const { task, project, role } = await accessTask(req.params.id, req.user.id);
      if (role === 'viewer') fail(403, 'Viewers cannot comment');
      const b = z.object({ body: z.string().trim().min(1).max(3000) }).parse(req.body);
      await q('INSERT INTO comments(id,task_id,user_id,body) VALUES($1,$2,$3,$4)', [
        id(),
        task.id,
        req.user.id,
        b.body,
      ]);
      await log(
        project.workspace_id,
        project.id,
        req.user.id,
        'Commented on ' + task.title,
        task.visibility,
      );
      res.status(201).json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
