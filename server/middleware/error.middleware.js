import { z } from 'zod';
export const errorHandler = (e, req, res, next) => {
  if (e instanceof z.ZodError)
    return res
      .status(400)
      .json({ error: e.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; ') });
  if (!e.status) console.error('API error', e.message);
  res
    .status(e.status || 500)
    .json({ error: e.status ? e.message : 'The request could not be completed' });
};
