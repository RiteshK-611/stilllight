import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const nativeOnly = process.argv.includes('--native');
const children = [];
let stopping = false;
function launch(args, cwd, input = false) {
  const child = spawn(process.execPath, args, { cwd, stdio: [input ? 'inherit' : 'ignore', 'inherit', 'inherit'], env: process.env });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300).unref();
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
console.log('Starting Stilllight: API on :3001, Expo on :8081. No paid services are enabled by this command.');
launch([path.join(root, 'server/node_modules/tsx/dist/cli.mjs'), 'watch', 'src/index.ts'], path.join(root, 'server'));
launch([path.join(root, 'node_modules/expo/bin/cli'), 'start', ...(nativeOnly ? [] : ['--web']), ...(process.argv.includes('--clear') ? ['--clear'] : []), '--port', '8081'], root, true);
