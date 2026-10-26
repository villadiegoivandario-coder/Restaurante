import { spawn } from 'node:child_process';
import { URL } from 'node:url';

const serverUrl = process.argv[2] ?? process.env.CAP_SERVER_URL ?? 'http://10.0.2.2:4173';
const parsedUrl = new URL(serverUrl);

if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
  throw new Error('The development server URL must use HTTP or HTTPS.');
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

await run(npm, ['run', 'build']);
await run(npx, ['cap', 'sync'], {
  ...process.env,
  CAPACITOR_DEV: 'true',
  CAP_SERVER_URL: serverUrl,
});
