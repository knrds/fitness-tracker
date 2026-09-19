const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');
const test = require('node:test');

// Resolve the dependencies actually consumed by Expo, not an unrelated test copy.
const mobile = createRequire(path.resolve(__dirname, '../../apps/mobile/package.json'));
const router = createRequire(mobile.resolve('expo-router/package.json'));
const expo = createRequire(mobile.resolve('expo/package.json'));
const cli = createRequire(expo.resolve('@expo/cli/package.json'));

function isolated(source) {
  const result = spawnSync(process.execPath, ['--max-old-space-size=64', '-e', source], {
    timeout: 5000,
    encoding: 'utf8',
    maxBuffer: 16 * 1024,
  });
  assert.equal(result.error, undefined, 'dependency probe must terminate within five seconds');
  assert.equal(result.signal, null, 'dependency probe must not crash');
  assert.equal(result.status, 0, result.stderr);
}

test('router nanoid rejects or safely handles negative non-secure size', () => {
  isolated(`
    const assert = require('node:assert/strict');
    const { nanoid } = require(${JSON.stringify(router.resolve('nanoid/non-secure'))});
    try { assert.equal(nanoid(-1), ''); }
    catch (error) { if (!(error instanceof RangeError)) throw error; }
    assert.equal(nanoid(21).length, 21);
  `);
});

test('router nanoid custom generator handles zero size without looping', () => {
  isolated(`
    const assert = require('node:assert/strict');
    const { customAlphabet } = require(${JSON.stringify(router.resolve('nanoid'))});
    const generate = customAlphabet('abcdef', 21);
    assert.equal(generate(0), '');
    assert.match(generate(21), /^[a-f]{21}$/);
  `);
});

test('Expo tar member filtering survives hostile long-path metadata', () => {
  isolated(`
    const tar = require(${JSON.stringify(cli.resolve('tar'))});
    const longPath = Buffer.from('a/'.repeat(12000) + 'file\\0');
    function header(values) {
      const buffer = Buffer.alloc(512);
      new tar.Header({ mode: 420, uid: 0, gid: 0, mtime: new Date(0), ...values }).encode(buffer);
      return buffer;
    }
    const archive = Buffer.concat([
      header({ path: '././@LongLink', type: 'NextFileHasLongPath', size: longPath.length }),
      longPath, Buffer.alloc((512 - longPath.length % 512) % 512),
      header({ path: 'file', type: 'File', size: 0 }), Buffer.alloc(1024),
    ]);
    const parser = tar.t({}, ['unrelated-member']);
    parser.on('error', error => { throw error; });
    parser.end(archive);
  `);
});

test('Expo undici rejects blob-like CRLF content type before sending a request', () => {
  isolated(`
    const assert = require('node:assert/strict');
    const http = require('node:http');
    const { request } = require(${JSON.stringify(cli.resolve('undici'))});
    let requests = 0;
    const server = http.createServer((req, res) => { requests++; req.resume(); res.end('ok'); });
    server.listen(0, '127.0.0.1', async () => {
      try {
        const body = {
          [Symbol.toStringTag]: 'Blob', size: 1, type: 'text/plain\\r\\nX-Injected: yes',
          stream: async function* () { yield Buffer.from('x'); },
          arrayBuffer: async () => new Uint8Array([120]).buffer,
        };
        await assert.rejects(request('http://127.0.0.1:' + server.address().port, {
          method: 'POST', body, headersTimeout: 1000, bodyTimeout: 1000,
        }), error => error.code === 'UND_ERR_INVALID_ARG');
        assert.equal(requests, 0);
        const valid = await request('http://127.0.0.1:' + server.address().port, {
          method: 'POST', body: new Blob(['x'], { type: 'text/plain' }),
          headersTimeout: 1000, bodyTimeout: 1000,
        });
        await valid.body.dump();
        assert.equal(valid.statusCode, 200);
        assert.equal(requests, 1);
      } catch (error) { console.error(error.message); process.exitCode = 1; }
      finally { server.closeAllConnections(); server.close(); }
    });
  `);
});
