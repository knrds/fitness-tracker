const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { inspectSarif, main } = require('./codeql-gate.cjs');
const report = (severity = '8.1', result = {}) => ({ version: '2.1.0', runs: [{
  tool: { driver: { name: 'CodeQL', rules: [{ id: 'js/path-injection',
    properties: { 'security-severity': severity, tags: ['security'] } }] } },
  invocations: [{ executionSuccessful: true }], results: [{ ruleId: 'js/path-injection', ...result }],
}] });

test('High results block despite warning level or accepted suppression', () => {
  const output = inspectSarif(report('8.1', { level: 'warning', suppressions: [{ status: 'accepted' }] }));
  assert.deepEqual(output, { results: 1, blockingRules: ['js/path-injection'] });
});
test('Critical blocks; classified lower results remain visible without a false High claim', () => {
  assert.equal(inspectSarif(report(9.9)).blockingRules.length, 1);
  assert.deepEqual(inspectSarif(report('6.9')), { results: 1, blockingRules: [] });
});
test('malformed, empty, foreign or incomplete analyses cannot imply success', () => {
  for (const value of [null, {}, { version: '2.1.0', runs: [] }, { ...report(), version: '1.0' }])
    assert.throws(() => inspectSarif(value), { code: 'INVALID_CODEQL_EVIDENCE' });
  for (const change of [run => { run.tool.driver.name = 'Other'; },
    run => { run.invocations = []; }, run => { run.invocations[0].executionSuccessful = false; },
    run => { run.tool.driver.rules = []; }, run => { delete run.results; }]) {
    const value = report(); change(value.runs[0]); assert.throws(() => inspectSarif(value));
  }
});
test('rule index resolves safely and contradictory or unknown rule identity fails closed', () => {
  const value = report('8.1', { ruleId: undefined, ruleIndex: 0 });
  assert.equal(inspectSarif(value).blockingRules.length, 1);
  for (const result of [{ ruleId: 'unknown' }, { ruleIndex: -1 }, { ruleIndex: 99 },
    { ruleId: 'unknown', ruleIndex: 0 }, { ruleIndex: '0' }])
    assert.throws(() => inspectSarif(report('8.1', result)));
});
test('missing or malformed security classifications cannot hide findings', () => {
  const missing = report(); delete missing.runs[0].tool.driver.rules[0].properties['security-severity'];
  assert.throws(() => inspectSarif(missing));
  for (const value of ['NaN', '', 'Infinity', -1, 11, null, {}, true])
    assert.throws(() => inspectSarif(report(value)));
});
test('duplicate or log-injecting rule IDs fail without exposing source messages', () => {
  const value = report(); value.runs[0].tool.driver.rules.push(value.runs[0].tool.driver.rules[0]);
  assert.throws(() => inspectSarif(value));
  const hostile = report(); hostile.runs[0].tool.driver.rules[0].id = 'secret\nlog';
  assert.throws(() => inspectSarif(hostile), error => !error.message.includes('secret'));
});
test('a completed zero-result analysis still requires query/runner evidence', () => {
  const value = report(); value.runs[0].results = [];
  assert.deepEqual(inspectSarif(value), { results: 0, blockingRules: [] });
});
test('CLI fails on missing/malformed files and retains only sanitized diagnostic output', () => {
  const root = mkdtempSync(join(tmpdir(), 'evaro-codeql-'));
  const oldExit = process.exitCode, oldError = console.error, oldLog = console.log;
  const logs = []; console.error = (...parts) => logs.push(parts.join(' ')); console.log = () => {};
  try {
    process.exitCode = undefined; main(root); assert.equal(process.exitCode, 1);
    writeFileSync(join(root, 'test.sarif'), 'private-source-fragment');
    process.exitCode = undefined; main(root); assert.equal(process.exitCode, 1);
    assert.ok(logs.every(line => !line.includes('private-source-fragment') && !line.includes(root)));
    writeFileSync(join(root, 'test.sarif'), JSON.stringify(report('8.1')));
    process.exitCode = undefined; main(root); assert.equal(process.exitCode, 1);
    writeFileSync(join(root, 'test.sarif'), JSON.stringify(report('3.1')));
    process.exitCode = undefined; main(root); assert.equal(process.exitCode, undefined);
  } finally {
    process.exitCode = oldExit; console.error = oldError; console.log = oldLog;
    rmSync(join(root, 'test.sarif'), { force: true }); rmdirSync(root);
  }
});

test('resolves rules referenced through query-pack extensions (CodeQL action v4 SARIF)', () => {
  const { inspectSarif } = require('./codeql-gate.cjs');
  const extensionReport = (severity) => ({
    version: '2.1.0',
    runs: [{
      tool: {
        driver: { name: 'CodeQL', rules: [] },
        extensions: [{ name: 'codeql/javascript-queries', rules: [
          { id: 'js/double-escaping', properties: { tags: ['security'], 'security-severity': severity } },
        ] }],
      },
      invocations: [{ executionSuccessful: true }],
      results: [{ ruleId: 'js/double-escaping', rule: { id: 'js/double-escaping', index: 0, toolComponent: { index: 0 } } }],
    }],
  });
  assert.deepEqual(inspectSarif(extensionReport('7.8')).blockingRules, ['js/double-escaping']);
  assert.deepEqual(inspectSarif(extensionReport('4.0')).blockingRules, []);
  for (const mutate of [
    (r) => { r.runs[0].results[0].rule.toolComponent.index = 5; },
    (r) => { r.runs[0].results[0].rule.index = 3; },
    (r) => { r.runs[0].results[0].rule.id = 'js/other'; },
    (r) => { r.runs[0].tool.extensions[0].rules = []; },
  ]) {
    const report = extensionReport('7.8');
    mutate(report);
    assert.throws(() => inspectSarif(report), /Incomplete or invalid CodeQL evidence/);
  }
});
