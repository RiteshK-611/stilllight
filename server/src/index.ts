import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
const config = loadConfig();
const instance = createApp(config);
const server = instance.app.listen(config.port, config.host, () => {
  console.log(`Stilllight API listening on http://localhost:${config.port} (${config.mode.toUpperCase()} mode)`);
  if (config.mode === 'demo') console.log('Demo uses local color effects. No AI requests or purchases are made.');
  else console.log(`LIVE AI enabled. Daily attempt cap: ${config.dailyLimit}. Pilot invite required.`);
});

async function stop() {
  server.close();
  await instance.close();
  process.exit(0);
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
