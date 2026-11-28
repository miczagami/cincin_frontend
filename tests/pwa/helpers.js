// Shared by the pwa specs
import { execFileSync, spawn } from 'node:child_process';
import { PWA_FIREBASE_ENV } from '../../playwright.config.js';

/**
 * A production build in `outDir` with no Firebase project (so no push), plus any `env` given.
 * The Firebase values are blank rather than unset: Vite would fill unset ones from a developer's .env.
 */
export function buildWithoutFirebase(outDir, env = {}) {
  const blankFirebase = Object.fromEntries(Object.keys(PWA_FIREBASE_ENV).map((name) => [name, '']));
  execFileSync('npx', ['vite', 'build', '--outDir', outDir], { env: { ...process.env, ...blankFirebase, ...env }, stdio: 'ignore' });
}

/** The script URL of the worker controlling the page, once one does. */
export async function controllingWorker(page) {
  return page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
    return new URL(navigator.serviceWorker.controller.scriptURL).pathname;
  });
}

/**
 * `vite preview` serving the build in `outDir` on `port`, once it says it is serving the port.
 * If the port is taken it exits instead, and this rejects rather than let a test run against
 * whatever already holds the port. Kill the returned process when done.
 */
export async function servePreview(outDir, port) {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', outDir, '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const serving = new Promise((resolve, reject) => {
    let output = '';
    const giveUp = setTimeout(() => reject(new Error(`vite preview did not start: ${output}`)), 20_000);
    server.stdout.on('data', (chunk) => {
      output += chunk;
      // eslint-disable-next-line no-control-regex
      if (output.replace(/\x1b\[[0-9;]*m/g, '').includes(`localhost:${port}`)) { clearTimeout(giveUp); resolve(); }
    });
    server.stderr.on('data', (chunk) => { output += chunk; });
    server.once('exit', (code) => { clearTimeout(giveUp); reject(new Error(`vite preview exited (code ${code}): ${output}`)); });
  });
  await serving.catch((error) => { server.kill(); throw error; });
  return server;
}
