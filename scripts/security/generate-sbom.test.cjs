'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { generateSbom, renderSbom, licenseInfo, safeSource } = require('./generate-sbom.cjs');

const source = { sha: '0123456789abcdef0123456789abcdef01234567', dirty: false };
const integrity = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
const generator = path.resolve(__dirname, 'generate-sbom.cjs');
const json = (file, object) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(object, null, 2)); };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evaro-sbom-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lock = { lockfileVersion: '9.0', importers: { '.': {} }, packages: {}, snapshots: {} };
  const rootManifest = { name: 'inventory-fixture', version: '1.0.0', private: true, packageManager: 'pnpm@11.5.0', license: 'MIT' };
  const modules = { nodeLinker: 'isolated', packageManager: 'pnpm@11.5.0', virtualStoreDir: '.pnpm', skipped: [],
    included: { dependencies: true, devDependencies: true, optionalDependencies: true }, registries: { default: 'https://registry.npmjs.org/' } };
  const workspace = { packages: ['packages/*'] };
  const directories = new Map();
  fs.mkdirSync(path.join(root, 'node_modules/.pnpm'), { recursive: true });
  function add(key, manifestChanges = {}, snapshot = {}) {
    const base = key.split('(')[0];
    const at = base.lastIndexOf('@');
    const name = base.slice(0, at), version = base.slice(at + 1);
    const directory = path.join(root, 'node_modules/.pnpm', `fixture-${directories.size}`, 'node_modules', ...name.split('/'));
    json(path.join(directory, 'package.json'), { name, version, license: 'MIT', ...manifestChanges });
    lock.packages[base] ||= { resolution: { integrity } };
    lock.snapshots[key] = snapshot;
    directories.set(key, directory);
    return directory;
  }
  function link(parentDirectory, alias, targetDirectory) {
    const target = path.join(parentDirectory, ...(path.basename(parentDirectory) === 'node_modules' ? [] : ['node_modules']), ...alias.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(targetDirectory, target, process.platform === 'win32' ? 'junction' : 'dir');
  }
  function direct(alias, key, field = 'dependencies') {
    (rootManifest[field] ||= {})[alias] = '*';
    (lock.importers['.'][field] ||= {})[alias] = { specifier: '*', version: key };
    link(root, alias, directories.get(key));
  }
  function save() {
    json(path.join(root, 'package.json'), rootManifest);
    json(path.join(root, 'pnpm-lock.yaml'), lock);
    json(path.join(root, 'node_modules/.pnpm/lock.yaml'), lock);
    json(path.join(root, 'node_modules/.modules.yaml'), modules);
    json(path.join(root, 'pnpm-workspace.yaml'), workspace);
  }
  return { root, lock, modules, workspace, rootManifest, directories, add, link, direct, save,
    generate: () => { save(); return generateSbom({ root, source }); } };
}

test('installed production and dev graph preserves duplicate versions and explicit leaf edges', (t) => {
  const f = fixture(t);
  const old = f.add('duplicate@1.0.0'), latest = f.add('duplicate@2.0.0');
  const a = f.add('alpha@1.0.0', { dependencies: { duplicate: '^1' } }, { dependencies: { duplicate: '1.0.0' } });
  const b = f.add('beta@1.0.0', { dependencies: { duplicate: '^2' } }, { dependencies: { duplicate: '2.0.0' } });
  f.link(path.dirname(a), 'duplicate', old); f.link(path.dirname(b), 'duplicate', latest);
  f.direct('alpha', 'alpha@1.0.0'); f.direct('beta', 'beta@1.0.0', 'devDependencies');
  const { bom, licenseFindings } = f.generate();
  assert.equal(bom.bomFormat, 'CycloneDX'); assert.equal(bom.specVersion, '1.6');
  const duplicates = bom.components.filter((c) => c.name === 'duplicate');
  assert.deepEqual(duplicates.map((c) => c.version).sort(), ['1.0.0', '2.0.0']);
  const alpha = bom.components.find((c) => c.name === 'alpha');
  const beta = bom.components.find((c) => c.name === 'beta');
  const edge = (c) => bom.dependencies.find((d) => d.ref === c['bom-ref']).dependsOn;
  assert.deepEqual(edge(alpha), [duplicates.find((c) => c.version === '1.0.0')['bom-ref']]);
  assert.deepEqual(edge(beta), [duplicates.find((c) => c.version === '2.0.0')['bom-ref']]);
  for (const component of duplicates) assert.deepEqual(edge(component), []);
  assert.equal(bom.dependencies.length, bom.components.length + 1);
  assert.equal(licenseFindings.length, 0);
});

test('same version peer variants retain separate component references and dependency edges', (t) => {
  const f = fixture(t);
  const oldPeer = f.add('peer@1.0.0'), newPeer = f.add('peer@2.0.0');
  const old = f.add('consumer@1.0.0(peer@1.0.0)', { peerDependencies: { peer: '*' } }, { dependencies: { peer: '1.0.0' } });
  const latest = f.add('consumer@1.0.0(peer@2.0.0)', { peerDependencies: { peer: '*' } }, { dependencies: { peer: '2.0.0' } });
  f.link(path.dirname(old), 'peer', oldPeer); f.link(path.dirname(latest), 'peer', newPeer);
  f.direct('consumer-old', 'consumer@1.0.0(peer@1.0.0)'); f.direct('consumer-new', 'consumer@1.0.0(peer@2.0.0)');
  const { bom } = f.generate();
  const consumers = bom.components.filter((c) => c.name === 'consumer');
  assert.equal(consumers.length, 2);
  assert.equal(new Set(consumers.map((c) => c['bom-ref'])).size, 2);
  assert.equal(new Set(consumers.map((c) => c.purl)).size, 1);
  assert.notDeepEqual(bom.dependencies.find((d) => d.ref === consumers[0]['bom-ref']).dependsOn,
    bom.dependencies.find((d) => d.ref === consumers[1]['bom-ref']).dependsOn);
});

test('locked npm dependencies sharing a builtin name remain in the installed inventory', (t) => {
  const f = fixture(t);
  f.add('punycode@2.3.1'); f.direct('punycode', 'punycode@2.3.1');
  assert.equal(f.generate().bom.components[0].name, 'punycode');
});

test('workspace links are matched to actual internal packages and share one canonical component', (t) => {
  const f = fixture(t);
  const directory = path.join(f.root, 'packages/shared');
  json(path.join(directory, 'package.json'), { name: '@fixture/shared', version: '1.0.0', private: true });
  f.lock.importers['packages/shared'] = {};
  f.rootManifest.dependencies = { '@fixture/shared': 'workspace:*' };
  f.lock.importers['.'].dependencies = { '@fixture/shared': { specifier: 'workspace:*', version: 'link:packages/shared' } };
  f.link(f.root, '@fixture/shared', directory);
  const { bom, licenseFindings } = f.generate();
  assert.equal(bom.components.length, 1);
  assert.equal(bom.components[0]['bom-ref'], 'workspace:packages/shared');
  assert.equal(bom.components[0].group, '@fixture');
  assert.deepEqual(bom.dependencies.find((d) => d.ref === 'workspace:.').dependsOn, ['workspace:packages/shared']);
  assert.equal(licenseFindings[0].status, 'undeclared');
  assert.equal(bom.components[0].licenses, undefined, 'undeclared is not a fake SPDX identifier');
});

test('missing installed edge or a dependency omitted from lock metadata fails closed', (t) => {
  for (const omit of ['installed', 'snapshot-edge']) {
    const f = fixture(t);
    const child = f.add('child@1.0.0');
    const parent = f.add('parent@1.0.0', { dependencies: { child: '*' } }, omit === 'snapshot-edge' ? {} : { dependencies: { child: '1.0.0' } });
    if (omit !== 'installed') f.link(path.dirname(parent), 'child', child);
    f.direct('parent', 'parent@1.0.0');
    assert.throws(() => f.generate(), { code: omit === 'installed' ? 'REQUIRED_GRAPH_DEPENDENCY_NOT_INSTALLED' : 'DECLARED_DEPENDENCY_MISSING_FROM_LOCKED_GRAPH' });
  }
});

test('unvisited lock nodes, stale installed lock and prod-only metadata cannot claim complete inventory', (t) => {
  const orphan = fixture(t); orphan.add('orphan@1.0.0');
  assert.throws(() => orphan.generate(), { code: 'INSTALLED_LOCK_GRAPH_COVERAGE_INCOMPLETE' });
  const stale = fixture(t); stale.save();
  json(path.join(stale.root, 'node_modules/.pnpm/lock.yaml'), { ...stale.lock, settings: { changed: true } });
  assert.throws(() => generateSbom({ root: stale.root, source }), { code: 'INSTALLED_LOCKFILE_DIFFERS_FROM_SOURCE' });
  const productionOnly = fixture(t); productionOnly.modules.included.devDependencies = false;
  assert.throws(() => productionOnly.generate(), { code: 'INCOMPLETE_INSTALLED_PNPM_METADATA' });
});

test('optional platform skips are explicit and cannot excuse a missing required dependency', (t) => {
  const f = fixture(t); f.add('platform-only@1.0.0', {}, { optional: true });
  f.modules.skipped = ['platform-only@1.0.0'];
  f.rootManifest.optionalDependencies = { 'platform-only': '*' };
  f.lock.importers['.'].optionalDependencies = { 'platform-only': { specifier: '*', version: '1.0.0' } };
  const { bom } = f.generate();
  assert.equal(bom.components.length, 0);
  assert.equal(bom.metadata.component.properties.find((p) => p.name === 'evaro:dependency:platform-skipped').value, '["pkg:npm/platform-only@1.0.0"]');
  delete f.rootManifest.optionalDependencies; delete f.lock.importers['.'].optionalDependencies;
  f.rootManifest.dependencies = { 'platform-only': '*' };
  f.lock.importers['.'].dependencies = { 'platform-only': { specifier: '*', version: '1.0.0' } };
  assert.throws(() => f.generate(), { code: 'REQUIRED_DEPENDENCY_MARKED_SKIPPED' });
});

test('identity, resolution provenance and workspace completeness are mandatory', (t) => {
  for (const change of ['identity', 'integrity', 'workspace']) {
    const f = fixture(t); const packageDir = f.add('alpha@1.0.0'); f.direct('alpha', 'alpha@1.0.0');
    if (change === 'identity') json(path.join(packageDir, 'package.json'), { name: 'alpha', version: '2.0.0', license: 'MIT' });
    if (change === 'integrity') f.lock.packages['alpha@1.0.0'].resolution = {};
    if (change === 'workspace') json(path.join(f.root, 'packages/missing/package.json'), { name: 'missing-workspace', version: '1.0.0' });
    assert.throws(() => f.generate(), { code: { identity: 'INSTALLED_IDENTITY_DIFFERS_FROM_LOCKFILE', integrity: 'MISSING_ARCHIVE_INTEGRITY_PROVENANCE', workspace: 'WORKSPACE_IMPORTER_GRAPH_INCOMPLETE' }[change] });
  }
});

test('workspace exclusions apply independently of pattern order', (t) => {
  const f = fixture(t);
  f.workspace.packages = ['!packages/excluded', 'packages/*'];
  json(path.join(f.root, 'packages/excluded/package.json'), { name: 'excluded-workspace', version: '1.0.0' });
  assert.equal(f.generate().bom.components.length, 0);
});

test('only declared inventory metadata is emitted and source credentials/query/fragment are removed', (t) => {
  const f = fixture(t);
  f.modules.registries.default = 'https://registry-user:private-registry-token@registry.npmjs.org/?token=registry-secret#fragment-secret';
  f.add('alpha@1.0.0', { license: 'MIT', repository: { url: 'git+https://user:repository-password@github.com/example/alpha.git?access_token=query-secret#fragment-secret' },
    author: { name: 'private-person', email: 'person-secret@example.com' }, description: 'private-description', scripts: { build: 'echo script-secret' } });
  f.direct('alpha', 'alpha@1.0.0');
  fs.writeFileSync(path.join(f.root, '.env'), 'DO_NOT_COPY_USER_SECRET=private-env-secret');
  const rendered = renderSbom(f.generate().bom);
  assert.match(rendered, /https:\/\/registry\.npmjs\.org\//);
  assert.match(rendered, /https:\/\/github\.com\/example\/alpha\.git/);
  for (const secret of ['private-registry-token', 'registry-secret', 'repository-password', 'query-secret', 'fragment-secret', 'person-secret', 'private-description', 'script-secret', 'private-env-secret', f.root.replace(/\\/g, '\\\\')]) {
    assert.ok(!rendered.includes(secret), 'private fields and absolute host paths must not be copied');
  }
  assert.equal(safeSource('file:///home/private/.env'), null);
  assert.equal(safeSource('http://localhost/private'), null);
});

test('rendering is deterministic across metadata ordering and repeated generation', (t) => {
  const f = fixture(t); f.add('alpha@1.0.0'); f.add('beta@2.0.0');
  f.direct('alpha', 'alpha@1.0.0'); f.direct('beta', 'beta@2.0.0', 'devDependencies');
  const first = renderSbom(f.generate().bom);
  assert.equal(renderSbom(f.generate().bom), first);
  f.lock.snapshots = Object.fromEntries(Object.entries(f.lock.snapshots).reverse());
  f.lock.packages = Object.fromEntries(Object.entries(f.lock.packages).reverse());
  // Raw lock hash intentionally changes for changed source bytes; graph and
  // inventory ordering still remain deterministic.
  const reordered = f.generate().bom;
  const original = JSON.parse(first);
  for (const bom of [original, reordered]) bom.metadata.properties = bom.metadata.properties.filter((p) => p.name !== 'evaro:source:lockfile-sha256');
  assert.equal(renderSbom(reordered), renderSbom(original));
});

test('license declarations and strict engineering screening preserve unresolved evidence without legal approval', (t) => {
  assert.equal(licenseInfo({ license: 'MIT OR Apache-2.0' }).screened, true);
  assert.equal(licenseInfo({ license: 'GPL-3.0-only OR MIT' }).screened, false);
  assert.equal(licenseInfo({ license: 'GPL-2.0-only WITH Classpath-exception-2.0' }).status, 'declared-spdx');
  assert.equal(licenseInfo({ license: 'SEE LICENSE IN LICENSE' }).status, 'license-file-reference-unresolved');
  assert.equal(licenseInfo({ license: 'invented-secret-license' }).status, 'unresolved-declaration');
  assert.equal(licenseInfo({ licenses: [{ type: 'MIT' }] }).status, 'declared-legacy-spdx');
  assert.equal(licenseInfo({ licenses: { type: 'MIT' } }).screened, true);
  assert.equal(licenseInfo({ licenses: [{ type: 'Apache 2.0' }] }).status, 'unresolved-legacy-declaration');
  assert.deepEqual(licenseInfo({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }).licenses, ['Apache-2.0', 'MIT']);
  const f = fixture(t); f.rootManifest.license = undefined;
  const { bom, licenseFindings } = f.generate();
  assert.equal(licenseFindings.length, 1);
  assert.equal(bom.metadata.component.licenses, undefined);
  const output = path.join(f.root, 'strict-inventory.json');
  const code = `const g=require(${JSON.stringify(generator)}); g.main(['--require-license','--output',${JSON.stringify(output)}], {generate:()=>g.generateSbom({root:${JSON.stringify(f.root)},source:${JSON.stringify(source)}})});`;
  const result = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /strict engineering license screening failed; inventory retained/);
  assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).bomFormat, 'CycloneDX');
});
