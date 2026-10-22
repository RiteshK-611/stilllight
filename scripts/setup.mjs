import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
// Invoke npm's JS CLI, not a shell command; this also works on Windows.
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this script with npm run setup.');
for (const cwd of [root, path.join(root, 'server')]) {
  const result = spawnSync(process.execPath, [npm, 'install'], { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
