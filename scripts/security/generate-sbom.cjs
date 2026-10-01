#!/usr/bin/env node
'use strict';

// CycloneDX 1.6 inventory of the installed, locked pnpm workspace graph.
// This is declared metadata evidence, not license approval, artifact integrity
// verification, runtime reachability, or a native/client artifact inventory.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const licenseData = require('./sbom-license-ids.json');

const declaredIds = new Set(licenseData.licenseIds);
const exceptionIds = new Set(licenseData.exceptionIds);
// Optional engineering screening only. No copyright/attribution or legal
// acceptance is inferred, even for an expression using only these identifiers.
const screenedIds = new Set(['0BSD', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MIT', 'Unlicense']);
const fields = ['dependencies', 'devDependencies', 'optionalDependencies'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = (values) => [...values].sort();
const properties = (values) => Object.entries(values).sort(([a], [b]) => compare(a, b)).map(([name, value]) => ({ name, value: String(value) }));
const stable = (value) => Array.isArray(value) ? value.map(stable) : record(value)
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;

class InventoryError extends Error {
  constructor(code) { super(code); this.name = 'InventoryError'; this.code = code; }
}
function requireEvidence(condition, code) { if (!condition) throw new InventoryError(code); }
function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function readBytes(file) {
  try {
    const stat = fs.statSync(file);
    requireEvidence(stat.isFile() && stat.size <= 20 * 1024 * 1024, 'INPUT_NOT_A_BOUNDED_FILE');
    return fs.readFileSync(file);
  } catch (error) {
    if (error instanceof InventoryError) throw error;
    throw new InventoryError('REQUIRED_INPUT_UNAVAILABLE');
  }
}
function readJson(file) {
  try { return JSON.parse(readBytes(file).toString('utf8')); }
  catch (error) {
    if (error instanceof InventoryError) throw error;
    throw new InventoryError('INVALID_PACKAGE_MANIFEST');
  }
}
function real(file) {
  try { return fs.realpathSync(file); } catch { throw new InventoryError('REQUIRED_INSTALLED_PATH_UNAVAILABLE'); }
}
function helpers() {
  try {
    // Already locked build dependency; no global tools or added package needed.
    const fromEslint = createRequire(require.resolve('eslint/package.json', { paths: [path.resolve(__dirname, '../..')] }));
    return { yaml: fromEslint('js-yaml'), semver: fromEslint('semver'), glob: fromEslint('glob'), minimatch: fromEslint('minimatch') };
  } catch { throw new InventoryError('INSTALLED_METADATA_HELPERS_UNAVAILABLE'); }
}
function parseYaml(bytes, yaml) {
  try { return yaml.load(bytes.toString('utf8'), { schema: yaml.JSON_SCHEMA }); }
  catch { throw new InventoryError('INVALID_PNPM_METADATA'); }
}
function validName(name) { return typeof name === 'string' && /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name) && name !== '.' && name !== '..'; }
function packageIdentity(key, semver) {
  requireEvidence(typeof key === 'string', 'UNSUPPORTED_LOCK_IDENTITY');
  const base = key.split('(')[0];
  const at = base.lastIndexOf('@');
  const name = base.slice(0, at);
  const version = base.slice(at + 1);
  requireEvidence(at > 0 && validName(name) && semver.valid(version) === version, 'UNSUPPORTED_LOCK_IDENTITY');
  return { name, version, base };
}
function manifestIdentity(manifest, semver) {
  requireEvidence(record(manifest) && validName(manifest.name) && typeof manifest.version === 'string' &&
    semver.valid(manifest.version) === manifest.version, 'INCOMPLETE_PACKAGE_IDENTITY');
  for (const field of [...fields, 'peerDependencies']) {
    requireEvidence(manifest[field] === undefined || record(manifest[field]), 'INVALID_DEPENDENCY_DECLARATIONS');
    for (const [name, specifier] of Object.entries(manifest[field] || {})) {
      requireEvidence(validName(name) && typeof specifier === 'string' && specifier.length > 0, 'INVALID_DEPENDENCY_DECLARATIONS');
    }
  }
}
function purl(name, version) {
  return `pkg:npm/${name.split('/').map(encodeURIComponent).join('/')}@${encodeURIComponent(version)}`;
}
function safeSource(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let source = value.trim().replace(/^git\+/, '');
  if (/^git@[a-z0-9.-]+:/i.test(source)) source = source.replace(/^git@([^:]+):/, 'https://$1/');
  try {
    const url = new URL(source);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname ||
        ['localhost', '127.0.0.1', '::1'].includes(url.hostname) || /[\r\n]/.test(source)) return null;
    url.username = ''; url.password = ''; url.search = ''; url.hash = '';
    return url.toString();
  } catch { return null; }
}
function licenseInfo(manifest) {
  const declared = typeof manifest.license === 'string' ? manifest.license
    : record(manifest.license) ? manifest.license.type : undefined;
  if (declared === undefined || declared === null || declared === '') {
    if (manifest.licenses === undefined) return { status: 'undeclared', screened: false };
    const entries = Array.isArray(manifest.licenses) ? manifest.licenses : [manifest.licenses];
    if (entries.length === 1 && record(entries[0]) && typeof entries[0].type === 'string') {
      const legacy = licenseInfo({ license: entries[0].type });
      return { ...legacy, status: legacy.expression ? 'declared-legacy-spdx' : 'unresolved-legacy-declaration' };
    }
    const ids = entries.map((entry) => record(entry) ? entry.type : undefined);
    if (ids.length && ids.every((id) => declaredIds.has(id))) return {
      status: 'declared-legacy-spdx-list', licenses: sorted(new Set(ids)), screened: ids.every((id) => screenedIds.has(id)),
    };
    return { status: 'unresolved-legacy-declaration', screened: false };
  }
  if (typeof declared !== 'string' || declared.length > 2048) return { status: 'unresolved-declaration', screened: false };
  if (/^SEE LICEN[CS]E IN /i.test(declared)) return { status: 'license-file-reference-unresolved', screened: false };
  const tokens = declared.match(/[A-Za-z0-9.+-]+|\(|\)/g) || [];
  if (tokens.length > 128 || tokens.join('').replace(/\s/g, '') !== declared.replace(/\s/g, '')) return { status: 'unresolved-declaration', screened: false };
  let position = 0;
  const ids = [];
  let hasException = false;
  function atom() {
    if (tokens[position] === '(') {
      position++; expression();
      if (tokens[position++] !== ')') throw new Error();
    } else {
      const id = tokens[position++];
      if (!declaredIds.has(id)) throw new Error();
      ids.push(id);
      if (tokens[position] === 'WITH') {
        position++; hasException = true;
        if (!exceptionIds.has(tokens[position++])) throw new Error();
      }
    }
  }
  function expression() {
    atom();
    while (['AND', 'OR'].includes(tokens[position])) { position++; atom(); }
  }
  try { expression(); if (position !== tokens.length) throw new Error(); }
  catch { return { status: 'unresolved-declaration', screened: false }; }
  return { status: 'declared-spdx', expression: tokens.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')'),
    screened: !hasException && ids.every((id) => screenedIds.has(id)) };
}
function sourceEvidence(packageMetadata, registry) {
  requireEvidence(record(packageMetadata) && record(packageMetadata.resolution), 'MISSING_RESOLUTION_PROVENANCE');
  const resolution = packageMetadata.resolution;
  requireEvidence(typeof resolution.integrity === 'string', 'MISSING_ARCHIVE_INTEGRITY_PROVENANCE');
  const integrity = resolution.integrity;
  const match = /^(sha512|sha384|sha256|sha1)-([A-Za-z0-9+/]+={0,2})$/.exec(integrity);
  requireEvidence(match !== null, 'UNSUPPORTED_ARCHIVE_INTEGRITY');
  const decoded = Buffer.from(match[2], 'base64');
  const lengths = { sha512: 64, sha384: 48, sha256: 32, sha1: 20 };
  requireEvidence(decoded.length === lengths[match[1]] && decoded.toString('base64') === match[2], 'INVALID_ARCHIVE_INTEGRITY');
  const url = safeSource(resolution.tarball === undefined ? registry : resolution.tarball);
  requireEvidence(url !== null, 'MISSING_SAFE_SOURCE_PROVENANCE');
  return { integrity, url, kind: resolution.tarball === undefined ? 'pnpm-recorded-registry' : 'lockfile-tarball-url-redacted' };
}
function sourceState(root) {
  const options = { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 };
  const commit = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], options);
  const status = spawnSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=normal'], options);
  requireEvidence(commit.status === 0 && /^[0-9a-f]{40}\s*$/.test(commit.stdout) && status.status === 0, 'SOURCE_COMMIT_EVIDENCE_UNAVAILABLE');
  return { sha: commit.stdout.trim(), dirty: status.stdout.trim() !== '' };
}

function generateSbom({ root = path.resolve(__dirname, '../..'), source = undefined } = {}) {
  root = real(root);
  const { yaml, semver, glob, minimatch } = helpers();
  const lockBytes = readBytes(path.join(root, 'pnpm-lock.yaml'));
  const lock = parseYaml(lockBytes, yaml);
  const modules = parseYaml(readBytes(path.join(root, 'node_modules/.modules.yaml')), yaml);
  const workspace = parseYaml(readBytes(path.join(root, 'pnpm-workspace.yaml')), yaml);
  requireEvidence(record(lock) && String(lock.lockfileVersion) === '9.0' && record(lock.importers) && record(lock.packages) && record(lock.snapshots), 'UNSUPPORTED_OR_INCOMPLETE_LOCKFILE');
  requireEvidence(record(modules) && modules.nodeLinker === 'isolated' && record(modules.included) &&
    fields.every((field) => modules.included[field] === true) && Array.isArray(modules.skipped) && record(modules.registries) &&
    typeof modules.virtualStoreDir === 'string', 'INCOMPLETE_INSTALLED_PNPM_METADATA');
  const virtualStore = real(path.resolve(root, 'node_modules', modules.virtualStoreDir));
  requireEvidence(inside(root, virtualStore), 'EXTERNAL_VIRTUAL_STORE_UNSUPPORTED');
  const installedLock = parseYaml(readBytes(path.join(virtualStore, 'lock.yaml')), yaml);
  requireEvidence(JSON.stringify(stable(lock)) === JSON.stringify(stable(installedLock)), 'INSTALLED_LOCKFILE_DIFFERS_FROM_SOURCE');
  requireEvidence(record(workspace) && Array.isArray(workspace.packages) && workspace.packages.every((pattern) =>
    typeof pattern === 'string' && !path.isAbsolute(pattern.replace(/^!/, '')) && !pattern.split(/[\\/]/).includes('..')), 'UNSUPPORTED_WORKSPACE_PATTERNS');
  const included = (relative) => workspace.packages.some((pattern) => !pattern.startsWith('!') && minimatch(relative, pattern)) &&
    !workspace.packages.some((pattern) => pattern.startsWith('!') && minimatch(relative, pattern.slice(1)));
  const expectedImporters = new Set(['.']);
  for (const pattern of workspace.packages.filter((item) => !item.startsWith('!'))) {
    for (const directory of glob.sync(pattern, { cwd: root, nodir: false, follow: false, ignore: ['node_modules/**', '**/node_modules/**', '.git/**'] })) {
      const relative = directory.replace(/\\/g, '/');
      if (included(relative) && fs.existsSync(path.join(root, directory, 'package.json'))) expectedImporters.add(relative);
    }
  }
  requireEvidence(JSON.stringify(sorted(expectedImporters)) === JSON.stringify(Object.keys(lock.importers).sort()), 'WORKSPACE_IMPORTER_GRAPH_INCOMPLETE');
  const workspaceNodes = new Map();
  const nodes = new Map();
  const visitedSnapshots = new Map();
  const skipped = new Set(modules.skipped);
  for (const relative of sorted(expectedImporters)) {
    requireEvidence(relative === '.' || (path.posix.normalize(relative) === relative && !relative.startsWith('../')), 'INVALID_WORKSPACE_IMPORTER_PATH');
    const directory = real(path.resolve(root, relative));
    requireEvidence(inside(root, directory) && !inside(path.join(root, 'node_modules'), directory), 'UNREVIEWED_WORKSPACE_LINK');
    const bytes = readBytes(path.join(directory, 'package.json'));
    const manifest = readJson(path.join(directory, 'package.json'));
    manifestIdentity(manifest, semver);
    const ref = `workspace:${relative}`;
    const node = { ref, directory, manifest, manifestHash: hash(bytes), workspace: relative, edges: new Set(), sections: {}, skipped: new Set() };
    requireEvidence(!workspaceNodes.has(directory), 'DUPLICATE_WORKSPACE_PATH');
    workspaceNodes.set(directory, node); nodes.set(ref, node);
  }
  const rootNode = nodes.get('workspace:.');
  requireEvidence(rootNode && /^pnpm@\d+\.\d+\.\d+$/.test(rootNode.manifest.packageManager || '') && modules.packageManager === rootNode.manifest.packageManager, 'PACKAGE_MANAGER_EVIDENCE_MISMATCH');
  source = source === undefined ? sourceState(root) : source;
  requireEvidence(record(source) && /^[0-9a-f]{40}$/.test(source.sha || '') && typeof source.dirty === 'boolean', 'INVALID_SOURCE_COMMIT_EVIDENCE');

  function targetKey(name, reference) {
    requireEvidence(validName(name) && typeof reference === 'string', 'INVALID_LOCKED_DEPENDENCY');
    if (reference.startsWith('link:')) return { link: reference.slice(5) };
    const key = Object.hasOwn(lock.snapshots, `${name}@${reference}`) ? `${name}@${reference}` : reference;
    requireEvidence(Object.hasOwn(lock.snapshots, key), 'MISSING_DEPENDENCY_SNAPSHOT');
    return { key, ...packageIdentity(key, semver) };
  }
  function resolveInstalled(parent, alias) {
    // A locked npm package can share a name with a Node builtin (punycode).
    // Resolve the installation search paths, not builtin execution precedence.
    const candidates = createRequire(path.join(parent.directory, 'package.json')).resolve.paths('evaro-sbom-metadata-probe') || [];
    for (const directory of candidates) {
      const candidate = path.join(directory, ...alias.split('/'));
      if (!fs.existsSync(candidate)) continue;
      const resolved = real(candidate);
      requireEvidence(inside(virtualStore, resolved) || workspaceNodes.has(resolved), 'UNREVIEWED_EXTERNAL_PACKAGE_LINK');
      return resolved;
    }
    throw new InventoryError('REQUIRED_GRAPH_DEPENDENCY_NOT_INSTALLED');
  }
  function connect(parent, alias, reference, section, optional) {
    const target = targetKey(alias, reference);
    if (target.key && skipped.has(target.key)) {
      requireEvidence(optional && lock.snapshots[target.key].optional === true, 'REQUIRED_DEPENDENCY_MARKED_SKIPPED');
      parent.skipped.add(purl(target.name, target.version)); return;
    }
    let directory;
    try { directory = resolveInstalled(parent, alias); }
    catch (error) {
      if (error instanceof InventoryError) error.subject = `${parent.manifest.name}@${parent.manifest.version} -> ${alias}`;
      throw error;
    }
    let child;
    if (target.link !== undefined) {
      const expected = real(path.resolve(parent.directory, target.link));
      child = workspaceNodes.get(directory);
      requireEvidence(child && directory === expected && child.manifest.name === alias, 'WORKSPACE_LINK_GRAPH_MISMATCH');
    } else {
      const manifest = readJson(path.join(directory, 'package.json'));
      manifestIdentity(manifest, semver);
      requireEvidence(manifest.name === target.name && manifest.version === target.version && inside(virtualStore, directory), 'INSTALLED_IDENTITY_DIFFERS_FROM_LOCKFILE');
      const ref = `npm:${hash(target.key)}`;
      child = nodes.get(ref);
      if (child) requireEvidence(child.directory === directory, 'DUPLICATE_LOCKED_INSTALLATION');
      else {
        const registry = modules.registries[target.name.startsWith('@') ? target.name.split('/')[0] : 'default'] || modules.registries.default;
        child = { ref, directory, manifest, manifestHash: hash(readBytes(path.join(directory, 'package.json'))),
          key: target.key, provenance: sourceEvidence(lock.packages[target.base], registry), edges: new Set(), sections: {}, skipped: new Set() };
        nodes.set(ref, child); visitedSnapshots.set(target.key, child);
        walk(child, lock.snapshots[target.key], false);
      }
    }
    parent.edges.add(child.ref);
    (parent.sections[section] ||= new Set()).add(child.ref);
  }
  function walk(node, locked, isWorkspace) {
    requireEvidence(record(locked), 'MISSING_LOCKED_GRAPH_NODE');
    const lockedNames = new Set(fields.flatMap((field) => Object.keys(locked[field] || {})));
    const requiredNames = new Set([...Object.keys(node.manifest.dependencies || {}), ...Object.keys(node.manifest.optionalDependencies || {}),
      ...Object.keys(node.manifest.peerDependencies || {}).filter((name) => node.manifest.peerDependenciesMeta?.[name]?.optional !== true)]);
    if (isWorkspace) for (const name of Object.keys(node.manifest.devDependencies || {})) requiredNames.add(name);
    requireEvidence([...requiredNames].every((name) => lockedNames.has(name)), 'DECLARED_DEPENDENCY_MISSING_FROM_LOCKED_GRAPH');
    for (const field of isWorkspace ? fields : ['dependencies', 'optionalDependencies']) {
      requireEvidence(locked[field] === undefined || record(locked[field]), 'INVALID_LOCKED_GRAPH_EDGES');
      for (const alias of Object.keys(locked[field] || {}).sort()) {
        const entry = locked[field][alias];
        if (isWorkspace) requireEvidence(Object.hasOwn(node.manifest[field] || {}, alias) && record(entry) && entry.specifier === node.manifest[field][alias], 'WORKSPACE_MANIFEST_DIFFERS_FROM_LOCKFILE');
        connect(node, alias, isWorkspace ? entry.version : entry, field, field === 'optionalDependencies');
      }
    }
  }
  for (const node of workspaceNodes.values()) walk(node, lock.importers[node.workspace], true);
  for (const key of Object.keys(lock.snapshots)) {
    requireEvidence(visitedSnapshots.has(key) || (skipped.has(key) && lock.snapshots[key].optional === true), 'INSTALLED_LOCK_GRAPH_COVERAGE_INCOMPLETE');
  }
  for (const node of workspaceNodes.values()) if (node !== rootNode) rootNode.edges.add(node.ref);

  const licenseFindings = [];
  function component(node) {
    const info = licenseInfo(node.manifest);
    if (!info.screened) licenseFindings.push({ ref: node.ref, package: node.manifest.name, version: node.manifest.version, status: info.status });
    const componentProperties = {
      'evaro:manifest:sha256': node.manifestHash,
      'evaro:license:status': info.status,
      'evaro:license:screening': info.screened ? 'within-optional-engineering-policy-no-legal-approval' : 'manual-review-required',
      'evaro:dependency:sections': JSON.stringify(Object.fromEntries(Object.entries(node.sections).sort().map(([field, refs]) => [field, sorted(refs)]))),
    };
    const references = [];
    if (node.workspace !== undefined) componentProperties['evaro:source:workspace'] = node.workspace;
    else {
      componentProperties['evaro:source:kind'] = node.provenance.kind;
      componentProperties['evaro:source:archive-integrity-declared-not-verified'] = node.provenance.integrity;
      references.push({ type: 'other', url: node.provenance.url, comment: 'Source provenance recorded by pnpm; credentials, query and fragment removed.' });
    }
    if (node.skipped.size) componentProperties['evaro:dependency:platform-skipped'] = JSON.stringify(sorted(node.skipped));
    const vcs = safeSource(typeof node.manifest.repository === 'string' ? node.manifest.repository : node.manifest.repository?.url);
    if (vcs) references.push({ type: 'vcs', url: vcs, comment: 'Declared package repository; upstream ownership not verified.' });
    const slash = node.manifest.name.indexOf('/');
    return { type: node.workspace !== undefined ? 'application' : 'library', 'bom-ref': node.ref,
      ...(slash >= 0 ? { group: node.manifest.name.slice(0, slash) } : {}), name: node.manifest.name.slice(slash + 1), version: node.manifest.version,
      ...(node.workspace === undefined ? { purl: purl(node.manifest.name, node.manifest.version) } : {}),
      ...(info.expression ? { licenses: [{ expression: info.expression, acknowledgement: 'declared' }] }
        : info.licenses ? { licenses: info.licenses.map((id) => ({ license: { id, acknowledgement: 'declared' } })) } : {}),
      ...(references.length ? { externalReferences: references.sort((a, b) => compare(`${a.type}:${a.url}`, `${b.type}:${b.url}`)) } : {}),
      properties: properties(componentProperties) };
  }
  const rootComponent = component(rootNode);
  const components = [...nodes.values()].filter((node) => node !== rootNode).sort((a, b) => compare(a.ref, b.ref)).map(component);
  licenseFindings.sort((a, b) => compare(a.ref, b.ref));
  const bom = { $schema: 'http://cyclonedx.org/schema/bom-1.6.schema.json', bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
    metadata: { lifecycles: [{ phase: 'build' }], component: rootComponent,
      properties: properties({
        'evaro:source:git-sha': source.sha,
        'evaro:source:working-tree-dirty': source.dirty,
        'evaro:source:lockfile-sha256': hash(lockBytes),
        'evaro:generator:sha256': hash(readBytes(__filename)),
        'evaro:license:identifier-data-sha256': hash(readBytes(path.join(__dirname, 'sbom-license-ids.json'))),
        'evaro:inventory:package-manager': modules.packageManager,
        'evaro:inventory:platform': `${process.platform}/${process.arch}`,
        'evaro:inventory:boundary': 'Installed locked production, development and optional workspace dependencies; platform skips explicit; stale virtual-store leftovers excluded. Not a bundle/native artifact SBOM, runtime reachability, legal approval, or verification of archive integrity.',
        'evaro:inventory:license-review-findings': JSON.stringify(licenseFindings),
        'evaro:license:strict-policy': JSON.stringify(sorted(screenedIds)),
      }) },
    components,
    dependencies: [...nodes.values()].sort((a, b) => compare(a.ref, b.ref)).map((node) => ({ ref: node.ref, dependsOn: sorted(node.edges) })),
  };
  return { bom, licenseFindings };
}
function renderSbom(bom) { return `${JSON.stringify(bom, null, 2)}\n`; }
function main(args = process.argv.slice(2), { generate = generateSbom } = {}) {
  try {
    let output; let requireLicense = false;
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--require-license') requireLicense = true;
      else if (args[index] === '--output' && typeof args[index + 1] === 'string') output = args[++index];
      else throw new InventoryError('UNSUPPORTED_ARGUMENT');
    }
    const { bom, licenseFindings } = generate();
    const rendered = renderSbom(bom);
    if (output) {
      fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
      fs.writeFileSync(output, rendered, { encoding: 'utf8', mode: 0o600 });
    } else process.stdout.write(rendered);
    console.error(`SBOM inventory: ${bom.components.length + 1} components; ${licenseFindings.length} declarations require manual license review. No legal or runtime approval inferred.`);
    if (requireLicense && licenseFindings.length) { console.error('SBOM strict engineering license screening failed; inventory retained.'); process.exitCode = 1; }
  } catch (error) {
    console.error(`SBOM generation failed closed: ${error instanceof InventoryError ? error.code : 'OUTPUT_OR_INTERNAL_FAILURE'}. No complete inventory claimed.`);
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { generateSbom, renderSbom, licenseInfo, safeSource, InventoryError, main };
