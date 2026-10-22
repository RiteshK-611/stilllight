import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'artifacts');
mkdirSync(artifacts, { recursive: true });
const platformBinary = `agent-browser-${process.platform}-${process.arch}${process.platform === 'win32' ? '.exe' : ''}`;
const candidates = [process.env.AGENT_BROWSER_BIN, path.join(root, 'node_modules/agent-browser/bin', platformBinary)];
const cache = process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA ?? '', 'npm-cache/_npx') : path.join(os.homedir(), '.npm/_npx');
if (existsSync(cache)) for (const name of readdirSync(cache)) candidates.push(path.join(cache, name, 'node_modules/agent-browser/bin', platformBinary));
const binary = candidates.find((candidate) => candidate && existsSync(candidate));
if (!binary) throw new Error('Install/cache agent-browser first (npx --yes agent-browser skills get core), or set AGENT_BROWSER_BIN to its native executable.');
const health = await (await fetch('http://localhost:3001/api/health')).json();
assert.equal(health.mode, 'demo', 'Smoke tests refuse to run against paid/live AI.');
const session = `stilllight-smoke-${process.pid}`;
const passed = [];
function browser(...args) {
  // On Windows, a freshly spawned daemon can inherit captured pipe handles.
  // Launch with inherited stdio once; subsequent commands can be captured safely.
  if (args[0] === 'open') {
    execFileSync(binary, ['--session', session, ...args], { cwd: root, stdio: 'inherit', timeout: 90_000 });
    return '';
  }
  return execFileSync(binary, ['--session', session, ...args], { cwd: root, encoding: 'utf8', timeout: 90_000, maxBuffer: 2 * 1024 * 1024 }).trim();
}
function pass(message) { passed.push(message); console.log(`PASS ${message}`); }
function center(selector, required = false) {
  if (required) browser('wait', '--fn', `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).some(node => node.getBoundingClientRect().width > 0 && !node.closest('[aria-hidden="true"], [inert]'))`);
  browser('eval', '-b', Buffer.from(`(() => {
    document.querySelectorAll('[data-smoke-target]').forEach(node => node.removeAttribute('data-smoke-target'));
    const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(node => node.getBoundingClientRect().width > 0 && !node.closest('[aria-hidden="true"], [inert]'));
    const target = candidates.at(-1);
    if (target) { target.scrollIntoView({block:"center",inline:"nearest"}); target.setAttribute('data-smoke-target','true'); }
  })();`).toString('base64'));
}
function clickTest(id) {
  // Expo UI's web Switch intentionally uses a zero-size checkbox with a visible label.
  if (id === 'photo-consent') { browser('check', '[data-testid="photo-consent"]'); return; }
  center(`[data-testid="${id}"]`, true); browser('click', '[data-smoke-target="true"]');
}
function fillTest(id, value) { center(`[data-testid="${id}"]`, true); browser('fill', '[data-smoke-target="true"]', value); }
function hoverTest(id) { center(`[data-testid="${id}"]`, true); browser('hover', '[data-smoke-target="true"]'); }
function button(name) { center(`[aria-label=${JSON.stringify(name)}]`); browser('find', 'role', 'button', 'click', '--name', name); }
function tab(name) { browser('find', 'role', 'tab', 'click', '--name', name); }
function visible(text) { browser('wait', '--text', text); }
function shot(name) {
  browser('wait', '--fn', `Array.from(document.images).filter(image => { const r=image.getBoundingClientRect(); return r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight && !image.closest('[aria-hidden="true"], [inert]'); }).every(image => image.complete && image.naturalWidth>0)`);
  browser('screenshot', path.join(artifacts, `${name}.png`));
}
function audit(name) {
  const result = JSON.parse(browser('a11y', '--tags', 'wcag2a,wcag2aa', '--json'));
  writeFileSync(path.join(artifacts, `a11y-${name}.json`), JSON.stringify(result.data, null, 2));
  assert.equal(result.data.counts.violations, 0, `${name} accessibility violations`);
  pass(`${name}: no automated WCAG A/AA violations (manual contrast checks recorded separately)`);
}
try {
  browser('open', 'http://localhost:8081');
  browser('set', 'viewport', '390', '844');
  browser('set', 'media', 'light', 'reduced-motion');
  visible('Your photos');
  shot('studio-light');
  pass('Studio loads at phone size with reduced-motion preference');

  clickTest('try-sample'); browser('wait', '--url', '**/edit');
  assert(browser('snapshot', '-i').includes('Try demo golden hour · 1 credit'));
  clickTest('photo-consent'); clickTest('generate-photo');
  browser('wait', '--url', '**/result/**');
  visible('A little more golden.'); shot('result-golden-hour');
  pass('Sample selection → consent → real demo rendering → persisted result');
  clickTest('favorite-edit');
  assert(browser('snapshot', '-i').includes('Remove favorite'));
  tab('Edited');
  assert.equal(browser('get', 'attr', '[aria-label="Before and after divider"]', 'aria-valuenow'), '0');
  browser('focus', '[aria-label="Before and after divider"]'); browser('press', 'ArrowRight');
  assert.equal(browser('get', 'attr', '[aria-label="Before and after divider"]', 'aria-valuenow'), '10');
  pass('Favorite and keyboard-accessible before/after comparison work');
  clickTest('save-photo'); visible('Your photo has been exported');
  pass('Photo export/download action completes');
  audit('result');

  button('Make another moment'); tab('Collection'); visible('Your collection.');
  assert(browser('snapshot', '-i').includes('Open Golden hour edit'));
  browser('reload'); visible('Your collection.');
  assert(browser('snapshot', '-i').includes('Open Golden hour edit'));
  button('Favorites');
  assert(browser('snapshot', '-i').includes('Open Golden hour edit'));
  fillTest('collection-search', 'no-such-look'); visible('No matching moments.');
  fillTest('collection-search', '');
  pass('Collection, favorite filter, search, and browser-reload persistence work');
  shot('collection');

  tab('Settings'); visible('A quieter studio.');
  hoverTest('server-url'); browser('scroll', 'down', '500');
  button('Light');
  shot('settings-light');
  tab('Studio'); visible('Your photos');
  shot('studio-light');
  // Headless Chrome cancels the OS file dialog immediately. Intercept only that
  // cancellation in the driver so CDP can supply a real file to Expo's input.
  // No picker result, API response, or application state is mocked.
  browser('eval', '-b', Buffer.from('document.addEventListener("cancel", event => { if (event.target instanceof HTMLInputElement && event.target.type === "file") event.stopImmediatePropagation(); }, { capture: true, once: true });').toString('base64'));
  clickTest('choose-photo');
  assert(Number(browser('get', 'count', 'input[type="file"]')) >= 1);
  browser('upload', 'input[type="file"]', path.join(root, 'assets/photos/original.jpg'));
  browser('wait', '--url', '**/edit');
  clickTest('look-direct-flash'); clickTest('photo-consent'); clickTest('generate-photo');
  browser('wait', '--url', '**/result/**'); visible('The night, caught right.');
  shot('result-after-hours');
  pass('Actual system file input upload and After hours look work');

  button('Make another moment'); clickTest('try-sample'); browser('wait', '--url', '**/edit');
  clickTest('look-soft-studio'); clickTest('photo-consent'); clickTest('generate-photo');
  browser('wait', '--url', '**/result/**'); visible('Your good-light moment.');
  shot('result-soft-studio');
  browser('set', 'viewport', '320', '700');
  const overflow = JSON.parse(browser('eval', '({width:innerWidth,scroll:document.documentElement.scrollWidth})'));
  assert(overflow.scroll <= overflow.width + 1);
  pass('Soft studio works and result layout fits a 320px phone viewport');
  browser('set', 'viewport', '390', '844');
  const consoleOutput = browser('console');
  assert(!consoleOutput.includes('[error]'), 'Unexpected browser console errors');
  pass('Core editing flow has no browser console errors');

  button('Make another moment'); tab('Settings'); visible('A quieter studio.');
  fillTest('server-url', 'http://127.0.0.1:3999'); clickTest('connect-server');
  visible('Cannot reach the studio');
  fillTest('server-url', 'http://localhost:3001'); clickTest('connect-server');
  visible('Connected to the studio.');
  pass('Offline API error is readable and reconnecting recovers the existing session');
  browser('console', '--clear');
  hoverTest('server-url'); browser('scroll', 'down', '500');
  button('Dark'); tab('Studio'); visible('Your photos');
  shot('studio-dark');
  audit('studio-dark');
  pass('Appearance switches to dark mode');
  writeFileSync(path.join(artifacts, 'smoke-results.json'), JSON.stringify({ date: new Date().toISOString(), mode: 'demo', checks: passed, note: 'Browser companion tested; not a native-device or live-AI quality test.' }, null, 2));
  console.log(`\n${passed.length} browser checks passed. Screenshots and audit reports: artifacts/`);
} catch (error) {
  try {
    shot('smoke-failure'); console.error(browser('snapshot', '-i'));
    const debug = browser('eval', '-b', Buffer.from(`JSON.stringify([...document.querySelectorAll('[data-testid="try-sample"]')].map(node => ({rect:node.getBoundingClientRect().toJSON(),ancestors:[...function*(n){for(let i=0;n&&i<8;i++,n=n.parentElement)yield {tag:n.tagName,height:n.clientHeight,scroll:n.scrollHeight,top:n.scrollTop,overflow:getComputedStyle(n).overflowY,hidden:n.getAttribute('aria-hidden')};}(node)]})))`).toString('base64'));
    writeFileSync(path.join(artifacts, 'smoke-dom-debug.json'), debug);
  } catch { /* Preserve the original test error. */ }
  throw error;
} finally { try { browser('close'); } catch { /* The named test browser may already be closed. */ } }
