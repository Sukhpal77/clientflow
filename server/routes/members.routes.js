import { withTransaction } from '../db/transaction.js';
import { z } from 'zod';
import { id, fail } from '../validation/schemas.js';
import { canManage } from '../services/auth.service.js';
export function membersRoutes(app, ctx) {
  const { pool, q, one, session, roleFor, accessProject, accessTask, log } = ctx;
  app.patch('/api/members/:wid/:uid', async (req, res, next) => {
    try {
      const role = z.enum(['admin', 'member', 'viewer', 'client']).parse(req.body.role);
      const actorRole = await roleFor(req.params.wid, req.user.id);
      if (!canManage(actorRole)) fail(403, 'Only owners and admins can change roles');
      const current = await roleFor(req.params.wid, req.params.uid);
      if (current === 'owner' || req.params.uid === req.user.id)
        fail(403, 'Cannot change the owner or your own role');
      if (actorRole === 'admin' && (current === 'admin' || role === 'admin'))
        fail(403, 'Only the owner can manage admin roles');
      await q('UPDATE memberships SET role=$1 WHERE workspace_id=$2 AND user_id=$3', [
        role,
        req.params.wid,
        req.params.uid,
      ]);
      await log(req.params.wid, null, req.user.id, 'Changed a team member role to ' + role);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.delete('/api/members/:wid/:uid', async (req, res, next) => {
    try {
      const { wid, uid } = req.params;
      const actor = await roleFor(wid, req.user.id),
        target = await roleFor(wid, uid);
      if (!canManage(actor)) fail(403, 'Only owners and admins can remove members');
      if (target === 'owner' || uid === req.user.id)
        fail(403, 'Cannot remove the owner or yourself');
      if (actor === 'admin' && target === 'admin') fail(403, 'Only the owner can remove admins');
      const user = await one('SELECT name,email FROM users WHERE id=$1', [uid]);
      await withTransaction(pool, async (client) => {
        await client.query(
          'UPDATE tasks SET assignee_id=NULL,revision=revision+1,updated_at=now() WHERE assignee_id=$1 AND project_id IN(SELECT id FROM projects WHERE workspace_id=$2)',
          [uid, wid],
        );
        await client.query(
          'DELETE FROM project_members WHERE user_id=$1 AND project_id IN(SELECT id FROM projects WHERE workspace_id=$2)',
          [uid, wid],
        );
        await client.query(
          'DELETE FROM invitations WHERE workspace_id=$1 AND email=$2 AND accepted_at IS NULL',
          [wid, user.email],
        );
        await client.query('DELETE FROM memberships WHERE workspace_id=$1 AND user_id=$2', [
          wid,
          uid,
        ]);
      });
      await log(wid, null, req.user.id, 'Removed ' + user.name + ' from the workspace');
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
