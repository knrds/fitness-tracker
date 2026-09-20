// Static export only. Deliberately independent from the authenticated/local Coach server.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function createPreviewServer(directory) {
  const root = path.resolve(directory);
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const reply = (status, message) => {
      res.writeHead(status);
      res.end(message);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, 'Static preview only');
    let route;
    try {
      route = decodeURIComponent(new URL(req.url, 'http://preview.invalid').pathname);
    } catch {
      return reply(400, 'Invalid path');
    }
    if (route === '/api' || route.startsWith('/api/'))
      return reply(503, 'API disabled in static preview');
    if (
      route.includes('\\') ||
      route.includes('\0') ||
      route
        .split('/')
        .some(
          (part, index, parts) =>
            part.startsWith('.') &&
            !(
              part === '.pnpm' &&
              index === 3 &&
              parts[1] === 'assets' &&
              parts[2] === '__node_modules'
            ),
        )
    )
      return reply(404, 'Not found');
    const extension = path.extname(route);
    if (extension && !mime[extension]) return reply(404, 'Not found');
    const file = extension ? path.resolve(root, '.' + route) : path.join(root, 'index.html');
    try {
      const realRoot = await fs.realpath(root);
      const realFile = await fs.realpath(file);
      const relative = path.relative(realRoot, realFile);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return reply(404, 'Not found');
      if (!(await fs.stat(realFile)).isFile()) return reply(404, 'Not found');
      const bytes = await fs.readFile(realFile);
      res.setHeader('Content-Type', mime[path.extname(realFile)] || 'application/octet-stream');
      res.writeHead(200);
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      reply(404, 'Build missing or file unavailable. Run pnpm build.');
    }
  });
}

function selectLanAddress(interfaces, requested) {
  const addresses = Object.entries(interfaces).flatMap(([name, rows]) =>
    (rows || [])
      .filter(
        (row) =>
          !row.internal &&
          row.family === 'IPv4' &&
          /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(row.address),
      )
      .map((row) => ({ name, address: row.address })),
  );
  if (requested) {
    if (addresses.some((row) => row.address === requested)) return requested;
    throw new Error('Host must be an assigned private IPv4 address.');
  }
  const wireless = addresses.filter((row) => /^(wlan|wi-?fi)(\s|$)/i.test(row.name));
  if (wireless.length === 1) return wireless[0].address;
  if (addresses.length === 1) return addresses[0].address;
  throw new Error('Choose your private network: pnpm preview:iphone --host <WLAN-IPv4>.');
}

module.exports = { createPreviewServer, selectLanAddress };
if (require.main === module) {
  const lan = process.argv.includes('--lan');
  const port = 8097;
  const hostIndex = process.argv.indexOf('--host');
  let host;
  try {
    host = lan
      ? selectLanAddress(
          os.networkInterfaces(),
          hostIndex < 0 ? undefined : process.argv[hostIndex + 1],
        )
      : '127.0.0.1';
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  const server = createPreviewServer(path.resolve(__dirname, '../apps/mobile/dist'));
  server.on('error', () => {
    console.error('Preview failed to listen; check port 8097.');
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`Static EVARO preview: http://${host}:${port}`);
    if (lan) {
      console.log(
        'Trusted private Wi-Fi only. Synthetic guest data only; HTTP is not HTTPS. No Coach API.',
      );
      console.log(`iPhone URL: http://${host}:${port}`);
    }
  });
}
