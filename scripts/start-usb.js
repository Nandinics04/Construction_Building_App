const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const CANDIDATES = [
  55000, 58000, 61000, 62000, 49152, 49200, 65000, 60000,
  3001, 3002, 3003, 8083, 8085, 5173, 4000, 9000, 19002, 19006, 24678, 7777,
];

function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickPort() {
  for (const port of CANDIDATES) {
    if (await canBind(port)) {
      return port;
    }
  }
  return null;
}

async function main() {
  const port = await pickPort();
  if (!port) {
    console.error(`
Windows is blocking IPv4 localhost (EACCES), so Metro cannot start.

1. Right-click Start → Windows PowerShell (Admin)
2. Run:

   net stop winnat
   net start winnat

3. Then run npm run start:usb again.
`);
    process.exit(1);
  }

  console.log(`
USB Metro port: ${port}

After Expo shows the QR code, in platform-tools run:
  .\\adb reverse tcp:${port} tcp:${port}

In Expo Go open:
  exp://127.0.0.1:${port}
`);

  const expoCli = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
  const child = spawn(
    process.execPath,
    ['--dns-result-order=ipv4first', expoCli, 'start', '--localhost', '--port', String(port)],
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: process.env,
    }
  );

  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
