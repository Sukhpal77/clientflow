import { id } from '../validation/schemas.js';
import { canManage, canAccessProject, canAccessTask } from '../services/auth.service.js';
export function bootstrapRoutes(app, ctx) {
  const { pool, q, one, session, roleFor, accessProject, accessTask, log } = ctx;
  app.get('/api/bootstrap', async (req, res, next) => {
    try {
      const workspaces = await q(
        'SELECT w.*,m.role FROM workspaces w JOIN memberships m ON m.workspace_id=w.id WHERE m.user_id=$1',
        [req.user.id],
      );
      const projects = [],
        tasks = [],
        members = [],
        activity = [],
        invitations = [],
        archivedProjects = [];
      for (const w of workspaces) {
        const all = await q('SELECT * FROM projects WHERE workspace_id=$1', [w.id]);
        const permitted = [];
        for (const p of all) {
          if (p.archived_at) {
            if (canManage(w.role)) archivedProjects.push(p);
            continue;
          }
          const pm = await one('SELECT * FROM project_members WHERE project_id=$1 AND user_id=$2', [
            p.id,
            req.user.id,
          ]);
          if (canAccessProject(w.role, p, !!pm)) {
            const pms = await q('SELECT user_id FROM project_members WHERE project_id=$1', [p.id]);
            projects.push({ ...p, member_ids: pms.map((m) => m.user_id) });
            permitted.push(p.id);
            const pt = await q('SELECT * FROM tasks WHERE project_id=$1 ORDER BY created_at', [
              p.id,
            ]);
            for (const t of pt)
              if (canAccessTask(w.role, t)) {
                const comments = await q(
                  'SELECT c.*,u.name FROM comments c JOIN users u ON c.user_id=u.id WHERE c.task_id=$1 ORDER BY c.created_at',
                  [t.id],
                );
                tasks.push({ ...t, comments });
              }
          }
        }
        const wm = await q(
          'SELECT u.id,u.name,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE workspace_id=$1',
          [w.id],
        );
        const visibleAssignees = new Set(
          tasks.filter((t) => permitted.includes(t.project_id)).map((t) => t.assignee_id),
        );
        members.push(
          ...wm
            .filter(
              (m) => w.role !== 'client' || m.id === req.user.id || visibleAssignees.has(m.id),
            )
            .map((m) => ({
              ...m,
              email: w.role === 'client' && m.id !== req.user.id ? '' : m.email,
              workspace_id: w.id,
            })),
        );

        const a = await q(
          'SELECT a.*,u.name FROM activity a JOIN users u ON u.id=a.user_id WHERE workspace_id=$1 ORDER BY a.created_at DESC LIMIT 100',
          [w.id],
        );
        activity.push(
          ...a.filter(
            (a) =>
              (!a.project_id ? canManage(w.role) : permitted.includes(a.project_id)) &&
              (w.role !== 'client' || a.visibility === 'client'),
          ),
        );
        if (canManage(w.role))
          invitations.push(
            ...(await q(
              'SELECT id,workspace_id,email,role,project_id,expires_at FROM invitations WHERE workspace_id=$1 AND accepted_at IS NULL AND expires_at>now()',
              [w.id],
            )),
          );
      }
      res.json({
        user: req.user,
        workspaces,
        projects,
        archivedProjects,
        tasks,
        members,
        activity,
        invitations,
      });
    } catch (e) {
      next(e);
    }
  });
}
