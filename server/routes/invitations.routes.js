import { z } from 'zod';
import { id, text, fail } from '../validation/schemas.js';
import { hashToken, newToken, canManage } from '../services/auth.service.js';
export function invitationsRoutes(app, ctx) {
  const { pool, q, one, session, roleFor, accessProject, accessTask, log } = ctx;
  app.post('/api/invitations', async (req, res, next) => {
    try {
      const b = z
        .object({
          workspace_id: text,
          email: z.email(),
          role: z.enum(['admin', 'member', 'viewer', 'client']),
          project_id: z.string().nullable().optional(),
        })
        .parse(req.body);
      const actorRole = await roleFor(b.workspace_id, req.user.id);
      if (b.role === 'admin' && actorRole !== 'owner')
        fail(403, 'Only the owner can invite admins');
      if (!canManage(actorRole)) fail(403, 'Only owners and admins can invite');
      const w = await one('SELECT * FROM workspaces WHERE id=$1', [b.workspace_id]);
      if (w.kind === 'personal') fail(403, 'Personal workspaces are private');
      if (b.role === 'client' && !b.project_id) fail(400, 'Choose a project for the client');
      if (b.project_id) {
        const { project } = await accessProject(b.project_id, req.user.id);
        if (project.workspace_id !== b.workspace_id)
          fail(400, 'Project belongs to another workspace');
      }
      const token = newToken();
      await q(
        'INSERT INTO invitations(id,workspace_id,email,role,project_id,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          id(),
          b.workspace_id,
          b.email.toLowerCase(),
          b.role,
          b.project_id || null,
          hashToken(token),
          new Date(Date.now() + 7 * 86400000),
        ],
      );
      await log(b.workspace_id, null, req.user.id, 'Invited ' + b.email + ' as ' + b.role);
      res.status(201).json({ token });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/invitations/accept', async (req, res, next) => {
    try {
      const token = z.string().min(32).max(128).parse(req.body.token);
      const inv = await one(
        'SELECT * FROM invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now()',
        [hashToken(token)],
      );
      if (!inv) fail(404, 'Invitation is invalid or expired');
      if (inv.email !== req.user.email) fail(403, 'Sign in using the invited email address');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const claim = await client.query(
          'UPDATE invitations SET accepted_at=now() WHERE id=$1 AND accepted_at IS NULL AND expires_at>now() RETURNING id',
          [inv.id],
        );
        if (!claim.rows.length) fail(404, 'Invitation is invalid or expired');
        if (inv.project_id) {
          const project = await client.query('SELECT archived_at FROM projects WHERE id=$1', [
            inv.project_id,
          ]);
          if (!project.rows.length || project.rows[0].archived_at)
            fail(409, 'The invited project is archived');
        }

        await client.query(
          'INSERT INTO memberships(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(workspace_id,user_id) DO NOTHING',
          [inv.workspace_id, req.user.id, inv.role],
        );
        if (inv.project_id)
          await client.query(
            'INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT(project_id,user_id) DO NOTHING',
            [inv.project_id, req.user.id],
          );

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      res.json({ ok: true, workspace_id: inv.workspace_id });
    } catch (e) {
      next(e);
    }
  });
  app.delete('/api/invitations/:id', async (req, res, next) => {
    try {
      const inv = await one('SELECT * FROM invitations WHERE id=$1', [req.params.id]);
      if (!inv) fail(404, 'Invitation not found');
      const role = await roleFor(inv.workspace_id, req.user.id);
      if (!canManage(role)) fail(403, 'Only owners and admins can revoke invitations');
      if (inv.role === 'admin' && role !== 'owner')
        fail(403, 'Only the owner can revoke admin invitations');
      if (inv.accepted_at) fail(409, 'Invitation is already accepted; remove the member instead');
      await q('DELETE FROM invitations WHERE id=$1', [inv.id]);
      await log(inv.workspace_id, null, req.user.id, 'Revoked invitation for ' + inv.email);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
