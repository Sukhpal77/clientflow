import { z } from 'zod';
import { id, text, date, fail } from '../validation/schemas.js';
import { canManage } from '../services/auth.service.js';
const fields = {
  name: text,
  client: z.string().max(200),
  description: z.string().max(2000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  visibility: z.enum(['team', 'private']),
  due_date: date,
};
export function projectsRoutes(app, ctx) {
  const { q, one, roleFor, log } = ctx;
  const managedProject = async (req) => {
    const project = await one('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!project) fail(404, 'Project not found');
    if (!canManage(await roleFor(project.workspace_id, req.user.id)))
      fail(403, 'Only owners and admins can manage projects');
    return project;
  };
  app.post('/api/projects', async (req, res, next) => {
    try {
      const b = z
        .object({
          ...fields,
          workspace_id: text,
          client: fields.client.default(''),
          description: fields.description.default(''),
          color: fields.color.default('#6366f1'),
          visibility: fields.visibility.default('team'),
        })
        .parse(req.body);
      if (!canManage(await roleFor(b.workspace_id, req.user.id)))
        fail(403, 'Only owners and admins can create projects');
      const pid = id();
      await q(
        'INSERT INTO projects(id,workspace_id,name,client,description,color,visibility,due_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          pid,
          b.workspace_id,
          b.name,
          b.client,
          b.description,
          b.color,
          b.visibility,
          b.due_date || null,
        ],
      );
      await log(b.workspace_id, pid, req.user.id, 'Created project ' + b.name);
      res.status(201).json({ id: pid });
    } catch (e) {
      next(e);
    }
  });
  app.patch('/api/projects/:id', async (req, res, next) => {
    try {
      const p = await managedProject(req);
      if (p.archived_at) fail(409, 'Restore the project before editing it');
      const b = z.object(fields).partial().parse(req.body);
      if (!Object.keys(b).length) fail(400, 'No project fields supplied');
      const n = { ...p, ...b };
      await q(
        'UPDATE projects SET name=$1,client=$2,description=$3,color=$4,visibility=$5,due_date=$6 WHERE id=$7',
        [n.name, n.client, n.description, n.color, n.visibility, n.due_date || null, p.id],
      );
      await log(p.workspace_id, p.id, req.user.id, 'Updated project ' + n.name);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/projects/:id/archive', async (req, res, next) => {
    try {
      const p = await managedProject(req);
      await q('UPDATE projects SET archived_at=now() WHERE id=$1', [p.id]);
      await log(p.workspace_id, p.id, req.user.id, 'Archived project ' + p.name);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/projects/:id/restore', async (req, res, next) => {
    try {
      const p = await managedProject(req);
      await q('UPDATE projects SET archived_at=NULL WHERE id=$1', [p.id]);
      await log(p.workspace_id, p.id, req.user.id, 'Restored project ' + p.name);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
