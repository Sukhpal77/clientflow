import { z } from 'zod';
import { id, text, fail } from '../validation/schemas.js';
import { hashPassword, checkPassword, hashToken } from '../services/auth.service.js';
export function authRoutes(app, ctx) {
  const { pool, q, one, session, roleFor, accessProject, accessTask, log } = ctx;
  const loginAttempts = new Map();
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const b = z
        .object({
          name: text,
          email: z.email().max(254),
          password: z.string().min(12).max(128),
          agency: text.optional().or(z.literal('')),
        })
        .parse(req.body);
      const uid = id(),
        wid = id(),
        personal = id();
      const password = await hashPassword(b.password);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)', [
          uid,
          b.name,
          b.email.toLowerCase(),
          password,
        ]);
        await client.query(
          'INSERT INTO workspaces(id,name,kind,owner_id) VALUES($1,$2,$3,$4),($5,$6,$7,$4)',
          [
            wid,
            b.agency || b.name + "'s agency",
            'agency',
            uid,
            personal,
            'Personal workspace',
            'personal',
          ],
        );
        await client.query(
          'INSERT INTO memberships(workspace_id,user_id,role) VALUES($1,$2,$3),($4,$2,$3)',
          [wid, uid, 'owner', personal],
        );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      await session(res, uid);
      res.status(201).json({ id: uid, name: b.name, email: b.email.toLowerCase() });
    } catch (e) {
      if (e.code === '23505')
        e = Object.assign(new Error('An account with this email already exists'), { status: 409 });
      next(e);
    }
  });
  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const b = z.object({ email: z.email(), password: z.string().max(128) }).parse(req.body);
      const key = req.ip;
      const record = loginAttempts.get(key);
      if (record && record.until > Date.now() && record.count >= 10)
        fail(429, 'Too many attempts. Try again in 15 minutes.');
      if (loginAttempts.size > 10000)
        for (const [k, v] of loginAttempts) if (v.until < Date.now()) loginAttempts.delete(k);
      const u = await one('SELECT * FROM users WHERE email=$1', [b.email.toLowerCase()]);
      if (!u || !(await checkPassword(b.password, u.password_hash))) {
        loginAttempts.set(key, {
          count: (record?.until > Date.now() ? record.count : 0) + 1,
          until: Date.now() + 900000,
        });
        fail(401, 'Email or password is incorrect');
      }
      loginAttempts.delete(key);
      await session(res, u.id);
      res.json({ id: u.id, name: u.name, email: u.email });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/auth/logout', async (req, res) => {
    if (req.cookies.cf_session)
      await q('DELETE FROM sessions WHERE token_hash=$1', [hashToken(req.cookies.cf_session)]);
    res.clearCookie('cf_session', { path: '/' });
    res.json({ ok: true });
  });
}
