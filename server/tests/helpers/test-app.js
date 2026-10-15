import pg from 'pg';
import { newDb } from 'pg-mem';
import { readFile } from 'node:fs/promises';
import { createApp } from '../../app.js';
import { randomUUID } from 'node:crypto';
export async function testApp() {
  const { Pool } = newDb().adapters.createPg();
  const pool = process.env.TEST_DATABASE_URL
    ? new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
    : new Pool();
  await pool.query(await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8'));
  const server = createApp(pool, { serveStatic: false }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  async function request(route, method = 'GET', body, cookie, headers = {}) {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
      setCookie: response.headers.get('set-cookie'),
    };
  }
  async function register(name) {
    const email = name.toLowerCase() + '-' + randomUUID() + '@example.test';
    const response = await request('/auth/register', 'POST', {
      name,
      email,
      password: 'Verification password 2026',
      agency: '',
    });
    return { ...response, email };
  }
  return {
    pool,
    request,
    register,
    close: async () => {
      await new Promise((r) => server.close(r));
      await pool.end();
    },
  };
}
