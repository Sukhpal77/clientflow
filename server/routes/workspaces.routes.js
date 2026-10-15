import { z } from 'zod';
import { id, text, fail } from '../validation/schemas.js';
import { canManage } from '../services/auth.service.js';
import { withTransaction } from '../db/transaction.js';
export function workspacesRoutes(app, ctx) {
  const { pool, q, roleFor, log } = ctx;
  app.post('/api/workspaces', async (req, res, next) => {
    try {
      const { name } = z.object({ name: text }).parse(req.body),
        wid = id();
      await withTransaction(pool, async (client) => {
        await client.query('INSERT INTO workspaces(id,name,kind,owner_id) VALUES($1,$2,$3,$4)', [
          wid,
          name,
          'agency',
          req.user.id,
        ]);
        await client.query('INSERT INTO memberships(workspace_id,user_id,role) VALUES($1,$2,$3)', [
          wid,
          req.user.id,
          'owner',
        ]);
      });
      res.status(201).json({ id: wid });
    } catch (e) {
      next(e);
    }
  });
  app.patch('/api/workspaces/:id', async (req, res, next) => {
    try {
      const { name } = z.object({ name: text }).parse(req.body);
      if (!canManage(await roleFor(req.params.id, req.user.id)))
        fail(403, 'Only owners and admins can rename workspaces');
      await q('UPDATE workspaces SET name=$1 WHERE id=$2', [name, req.params.id]);
      await log(req.params.id, null, req.user.id, 'Renamed workspace to ' + name);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
