import { spawn } from 'node:child_process';
import path from 'node:path';
const command =
  process.argv[2] === 'install' ? ['install', 'chromium'] : ['test', ...process.argv.slice(2)];
const child = spawn(
  process.execPath,
  [path.resolve('node_modules/@playwright/test/cli.js'), ...command],
  {
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.resolve('.cache/ms-playwright') },
  },
);
child.on('error', (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
child.on('close', (c) => (process.exitCode = c || 0));
