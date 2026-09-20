const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { once } = require('node:events');
const { createPreviewServer, selectLanAddress } = require('./iphone-preview.cjs');
let folder, server, base;
const address = (value) => ({ family: 'IPv4', internal: false, address: value });
test('LAN selection binds Wi-Fi rather than every VPN/virtual adapter', () => {
  assert.equal(
    selectLanAddress({
      WLAN: [address('192.168.0.2')],
      VPN: [address('26.0.0.1')],
      Virtual: [address('192.168.56.1')],
    }),
    '192.168.0.2',
  );
});
test('ambiguous private interfaces require explicit selection', () => {
  const interfaces = { Ethernet: [address('10.0.0.2')], Virtual: [address('192.168.56.1')] };
  assert.throws(() => selectLanAddress(interfaces));
  assert.equal(selectLanAddress(interfaces, '10.0.0.2'), '10.0.0.2');
});
test('LAN binding rejects unassigned and public addresses', () => {
  const interfaces = { WLAN: [address('192.168.0.2')], VPN: [address('26.0.0.1')] };
  for (const host of ['0.0.0.0', '26.0.0.1', '192.168.0.99'])
    assert.throws(() => selectLanAddress(interfaces, host));
});
before(async () => {
  folder = await fs.mkdtemp(path.join(os.tmpdir(), 'evaro-static-test-'));
  await fs.writeFile(path.join(folder, 'index.html'), '<div id="root">fixture</div>');
  await fs.writeFile(path.join(folder, 'manifest.webmanifest'), '{"display":"standalone"}');
  await fs.writeFile(path.join(folder, '.env'), 'synthetic fixture, not a secret');
  await fs.writeFile(path.join(folder, 'bundle.js.map'), 'source map fixture');
  await fs.mkdir(path.join(folder, 'assets', '__node_modules', '.pnpm'), { recursive: true });
  await fs.writeFile(
    path.join(folder, 'assets', '__node_modules', '.pnpm', 'icon.ttf'),
    'font fixture',
  );
  server = createPreviewServer(folder);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  // Only files explicitly created by this test; no recursive directory deletion.
  if (folder) {
    await fs.unlink(path.join(folder, 'assets', '__node_modules', '.pnpm', 'icon.ttf'));
    await fs.rmdir(path.join(folder, 'assets', '__node_modules', '.pnpm'));
    await fs.rmdir(path.join(folder, 'assets', '__node_modules'));
    await fs.rmdir(path.join(folder, 'assets'));
    for (const file of ['index.html', 'manifest.webmanifest', '.env', 'bundle.js.map'])
      await fs.unlink(path.join(folder, file));
    await fs.rmdir(folder);
  }
});
test('SPA routes return exported HTML without caching or MIME sniffing', async () => {
  const response = await fetch(base + '/history');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(await response.text(), /fixture/);
});
test('Expo exported pnpm font paths work while other hidden paths stay blocked', async () => {
  const response = await fetch(base + '/assets/__node_modules/.pnpm/icon.ttf');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'font/ttf');
  assert.equal(await response.text(), 'font fixture');
  for (const route of [
    '/assets/.pnpm/icon.ttf',
    '/assets/__node_modules/.env',
    '/.pnpm/icon.ttf',
  ]) {
    assert.equal((await fetch(base + route)).status, 404);
  }
});
test('manifest has its actual MIME type and HEAD returns no body', async () => {
  const response = await fetch(base + '/manifest.webmanifest', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/manifest+json');
  assert.equal(await response.text(), '');
});
test('API is unavailable even when requests provide a bearer', async () => {
  assert.equal(
    (await fetch(base + '/api/coach-chat', { headers: { Authorization: 'Bearer fixture' } }))
      .status,
    503,
  );
});
test('non-read methods cannot invoke local functionality', async () => {
  for (const method of ['POST', 'PUT', 'DELETE'])
    assert.equal((await fetch(base + '/', { method })).status, 405);
});
test('hidden files, source maps and encoded traversal are not served', async () => {
  for (const route of [
    '/.env',
    '/bundle.js.map',
    '/%2e%2e%2fpackage.json',
    '/%5c..%5c.env',
    '/missing.png',
  ])
    assert.equal((await fetch(base + route)).status, 404, route);
});
test('malformed encodings return an error without crashing the server', async () => {
  assert.equal((await fetch(base + '/%ZZ')).status, 400);
  assert.equal((await fetch(base + '/')).status, 200);
});
