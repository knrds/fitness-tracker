const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env.coach.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const handler = require('./coach-chat');
const dist = path.join(root, 'apps', 'mobile', 'dist');
const port = Number(process.env.COACH_LOCAL_PORT || 8096);
const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
async function serve(req, res) {
  const origin = req.headers.origin;
  if (!origins.has('http://' + req.headers.host) || (origin && !origins.has(origin))) {
    res.writeHead(403);
    res.end('Origin not allowed');
    return;
  }
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/api/coach-chat') {
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      res.writeHead(403);
      res.end();
      return;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 20000) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    req.body = Buffer.concat(chunks).toString('utf8');
    // Trusted server property, never derived from a user header. Server binds only loopback.
    req.localCoachUser = 'loopback-development';
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
      return res;
    };
    await handler(req, res);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  let file = path.resolve(dist, '.' + decoded);
  const relative = path.relative(dist, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!path.extname(file)) file = path.join(dist, 'index.html');
  try {
    const info = await fs.promises.stat(file);
    if (!info.isFile()) throw Error('not a file');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') res.end();
    else
      fs.createReadStream(file)
        .on('error', () => res.destroy())
        .pipe(res);
  } catch {
    res.writeHead(404);
    res.end('Preview missing. Run pnpm build first.');
  }
}
const server = http.createServer((req, res) => {
  serve(req, res).catch(() => {
    if (res.destroyed || res.writableEnded) return;
    if (res.headersSent) res.destroy();
    else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Local server request failed.' }));
    }
  });
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Local app + Coach API: http://127.0.0.1:${port}`);
  console.log(
    process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL
      ? 'Coach provider configured.'
      : 'Set OPENROUTER_API_KEY and OPENROUTER_MODEL in .env.coach.local; restart this server.',
  );
});
