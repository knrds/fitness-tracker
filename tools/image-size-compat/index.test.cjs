const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../..');
const icon = path.join(root, 'apps/mobile/public/app-icon.png');
// Resolve exactly as Metro does, through the installed dependency graph.
const metroRequire = createRequire(require.resolve('metro/package.json', { paths: [path.join(root, 'apps/mobile')] }));

test('Metro receives the adapter with the image-size 1.x path and buffer signatures', () => {
  const sizeOf = metroRequire('image-size');
  assert.deepEqual({ ...sizeOf(icon), type: undefined }, { width: 1024, height: 1024, type: undefined });
  assert.equal(sizeOf(fs.readFileSync(icon)).width, 1024);
  assert.equal(sizeOf.default, sizeOf);
  assert.throws(() => sizeOf(42), TypeError);
});

test('the adapter runs on a patched parser, never the vulnerable <= 2.0.2 line', () => {
  const adapter = metroRequire.resolve('image-size');
  // image-size 2.x does not export package.json; read it next to its resolved entry.
  let dir = path.dirname(createRequire(adapter).resolve('image-size'));
  while (!fs.existsSync(path.join(dir, 'package.json')) || JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name !== 'image-size') dir = path.dirname(dir);
  const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const [major, minor, patch] = version.split('.').map(Number);
  assert.ok(major > 2 || (major === 2 && (minor > 0 || patch >= 3)), `image-size ${version} is vulnerable`);
});
