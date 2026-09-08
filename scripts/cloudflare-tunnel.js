const { spawn } = require('child_process');

function startCloudflareTunnel(port) {
  return new Promise((resolve, reject) => {
    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const origin = `http://localhost:${port}`;
    const child = spawn(npxBin, ['--yes', 'cloudflared', 'tunnel', '--url', origin], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error('Cloudflare tunnel timed out'));
      }
    }, 90000);

    const onData = (buf) => {
      const text = buf.toString();
      process.stderr.write(text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        const url = match[0].replace(/\/$/, '');
        resolve({
          child,
          getActiveUrl: () => url,
          startAsync: async () => url,
          stopAsync: async () => {
            child.kill();
          },
        });
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`Cloudflare tunnel exited with code ${code}`));
      }
    });
  });
}

module.exports = { startCloudflareTunnel };
