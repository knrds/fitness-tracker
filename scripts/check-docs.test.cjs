const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { checkDocument, checkRepository } = require('./check-docs.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evaro-docs-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text = '') => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  return { root, write };
}

test('documentation links resolve code, licenses, directories, spaces and parentheses', (t) => {
  const { root, write } = fixture(t);
  write('src/contract.ts');
  write('LICENSE');
  write('docs/Guide (current).md');
  const markdown = [
    '[source](../src/contract.ts#L10)',
    '[license](../LICENSE)',
    '[directory](../src/)',
    '[guide](<Guide (current).md> "Title")',
    '[encoded](Guide%20%28current%29.md?mode=preview#overview)',
    '[escaped](Guide%20\\(current\\).md)',
    '[reference][source]',
    '[source]: ../src/contract.ts "Code"',
    '[online](https://example.invalid/unavailable)',
    '[anchor](#a-heading-that-is-not-checked)',
  ].join('\n');
  assert.deepEqual(checkDocument(root, 'docs/README.md', markdown), []);
});

test('deleted targets are diagnosed for inline images and reference links with source lines', (t) => {
  const { root } = fixture(t);
  const errors = checkDocument(root, 'docs/README.md', [
    '# Docs',
    '[old](old-plan.md)',
    '![preview](missing.png)',
    '[source]: missing.ts',
  ].join('\n'));
  assert.equal(errors.length, 3);
  assert.match(errors[0], /README.md:2: missing local target: old-plan.md/);
  assert.match(errors[1], /README.md:3: missing local target: missing.png/);
  assert.match(errors[2], /README.md:4: missing local target: missing.ts/);
});

test('code samples and comments do not create documentation link failures', (t) => {
  const { root } = fixture(t);
  const markdown = [
    '`[sample](absent.md)`',
    '``literal ` [sample](absent.md)``',
    '```md',
    '[sample](absent.md)',
    '```',
    '~~~md',
    '[sample](absent.md)',
    '~~~',
    '<!-- [sample](absent.md) -->',
    '[real](missing.md)',
  ].join('\n');
  const errors = checkDocument(root, 'README.md', markdown);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /README.md:10: missing local target/);
});

test('traversal and nonportable absolute links fail even when a target exists', (t) => {
  const { root } = fixture(t);
  for (const destination of ['../outside.md', '%2e%2e/outside.md', '..\\outside.md']) {
    assert.match(checkDocument(root, 'README.md', `[escape](${destination})`)[0], /escapes repository/);
  }
  for (const destination of ['/README.md', 'C:\\outside.md', 'file:///tmp/outside.md']) {
    assert.match(checkDocument(root, 'README.md', `[absolute](${destination})`)[0], /absolute local link/);
  }
  assert.match(checkDocument(root, 'README.md', '[invalid](bad%ZZ.md)')[0], /invalid URL encoding/);
});

test('existing directory symlinks cannot make a link escape the repository', (t) => {
  const { root: workspace, write } = fixture(t);
  write('repository/README.md');
  write('outside/private.md');
  const root = path.join(workspace, 'repository');
  fs.symlinkSync(path.join(workspace, 'outside'), path.join(root, 'linked'), 'junction');
  const errors = checkDocument(root, 'README.md', '[outside](linked/private.md)');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /symlink outside repository/);
});

test('repository scan includes new Markdown, ignores ignored files and skips removed tracked docs', (t) => {
  const { root, write } = fixture(t);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  write('.gitignore', 'ignored/\n');
  write('README.md', '[guide](docs/new.md)');
  write('retired.md', '[obsolete](absent.md)');
  execFileSync('git', ['-c', 'core.autocrlf=false', 'add', '.'], { cwd: root });
  fs.unlinkSync(path.join(root, 'retired.md'));
  write('docs/new.md', '[source](../src/code.ts)');
  write('src/code.ts');
  write('ignored/draft.md', '[invalid](missing.md)');
  write('notes.mdx', '[missing](gone.md)');
  const result = checkRepository(root);
  assert.deepEqual(result.files.sort(), ['README.md', 'docs/new.md', 'notes.mdx']);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /notes.mdx:1: missing local target: gone.md/);
});
