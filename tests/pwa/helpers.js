// Shared by the pwa specs
import { spawn } from 'node:child_process';

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
