import { createWorkspaceService } from './services/workspace.service.js';
import { authenticationMiddleware, requireUser } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashToken, newToken } from './services/auth.service.js';

import { authRoutes } from './routes/auth.routes.js';
import { bootstrapRoutes } from './routes/bootstrap.routes.js';
import { workspacesRoutes } from './routes/workspaces.routes.js';
import { projectsRoutes } from './routes/projects.routes.js';
import { tasksRoutes } from './routes/tasks.routes.js';
import { invitationsRoutes } from './routes/invitations.routes.js';
import { membersRoutes } from './routes/members.routes.js';
import { projectAccessRoutes } from './routes/projectAccess.routes.js';
export function createApp(pool, { serveStatic = true } = {}) {
  const app = express();
  app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'style-src': ["'self'", "'unsafe-inline'"],
          'connect-src': ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  const { q, one, roleFor, accessProject, accessTask, log } = createWorkspaceService(pool);
  app.get('/health', async (req, res) => {
    try {
      await q('SELECT 1');
      res.json({ status: 'ok', application: 'ClientFlow' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use('/api', authenticationMiddleware(one));
  async function session(res, uid) {
    const token = newToken();
    await q('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [
      hashToken(token),
      uid,
      new Date(Date.now() + 7 * 86400000),
    ]);
    res.cookie('cf_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 86400000,
      path: '/',
    });
  }
  const ctx = { pool, q, one, session, roleFor, accessProject, accessTask, log };
  authRoutes(app, ctx);
  app.use('/api', requireUser);
  bootstrapRoutes(app, ctx);
  workspacesRoutes(app, ctx);
  projectsRoutes(app, ctx);
  tasksRoutes(app, ctx);
  invitationsRoutes(app, ctx);
  membersRoutes(app, ctx);
  projectAccessRoutes(app, ctx);
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
  if (serveStatic) {
    const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
    app.use(express.static(dist));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
