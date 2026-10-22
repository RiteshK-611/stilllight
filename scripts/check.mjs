import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const checks = [
  ['Mobile TypeScript', root, ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['Mobile ESLint', root, ['node_modules/eslint/bin/eslint.js', 'src', '--max-warnings', '0']],
  ['API TypeScript', path.join(root, 'server'), ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['API tests', path.join(root, 'server'), ['node_modules/tsx/dist/cli.mjs', '--test', 'test/*.test.ts']],
];
for (const [name, cwd, args] of checks) {
  console.log(`\n${name}`);
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
