import { fail } from '../validation/schemas.js';
import { hashToken } from '../services/auth.service.js';
export function authenticationMiddleware(one) {
  return async (req, res, next) => {
    try {
      if (
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
        req.headers.origin &&
        req.headers.origin !== process.env.APP_ORIGIN &&
        !(
          process.env.NODE_ENV !== 'production' &&
          ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(req.headers.origin)
        )
      )
        fail(403, 'Origin is not permitted');
      if (req.cookies.cf_session) {
        req.user = await one(
          'SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()',
          [hashToken(req.cookies.cf_session)],
        );
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}
export const requireUser = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Sign in to continue' });
