import { id, fail } from '../validation/schemas.js';
import { canManage } from '../services/auth.service.js';
export function projectAccessRoutes(app, ctx) {
  const { pool, q, one, session, roleFor, accessProject, accessTask, log } = ctx;
  app.put('/api/projects/:id/members/:uid', async (req, res, next) => {
    try {
      const { project, role } = await accessProject(req.params.id, req.user.id);
      if (!canManage(role)) fail(403, 'Only owners and admins can manage project access');
      await roleFor(project.workspace_id, req.params.uid);
      await q(
        'INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT(project_id,user_id) DO NOTHING',
        [project.id, req.params.uid],
      );
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.delete('/api/projects/:id/members/:uid', async (req, res, next) => {
    try {
      const { project, role } = await accessProject(req.params.id, req.user.id);
      if (!canManage(role)) fail(403, 'Only owners and admins can manage project access');
      await q('DELETE FROM project_members WHERE project_id=$1 AND user_id=$2', [
        project.id,
        req.params.uid,
      ]);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
