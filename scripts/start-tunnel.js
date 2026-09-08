const path = require('path');
const { spawn } = require('child_process');

console.log(`
Starting Expo tunnel (Cloudflare). You do not need npx expo login.

Wait for:  Cloudflare tunnel ready
Then open the exp://....trycloudflare.com:443 URL in Expo Go.
`);

const expoCli = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const child = spawn(
  process.execPath,
  ['--dns-result-order=ipv4first', expoCli, 'start', '--tunnel'],
  {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env,
  }
);

child.on('exit', (code) => process.exit(code ?? 1));
