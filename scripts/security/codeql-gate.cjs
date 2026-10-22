'use strict';
const { readFileSync, readdirSync, lstatSync } = require('node:fs');
const { resolve, join } = require('node:path');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeId = (value) => typeof value === 'string' && /^[A-Za-z0-9_./-]{1,200}$/.test(value);
class AnalysisError extends Error {
  constructor() { super('Incomplete or invalid CodeQL evidence'); this.code = 'INVALID_CODEQL_EVIDENCE'; }
}
function requireEvidence(ok) { if (!ok) throw new AnalysisError(); }

function inspectSarif(report) {
  requireEvidence(record(report) && report.version === '2.1.0' &&
    Array.isArray(report.runs) && report.runs.length > 0 && report.runs.length <= 8);
  let results = 0;
  const blocking = new Set();
  for (const run of report.runs) {
    requireEvidence(record(run) && run.tool?.driver?.name === 'CodeQL' &&
      Array.isArray(run.tool.driver.rules) && run.tool.driver.rules.length > 0 &&
      Array.isArray(run.results) && Array.isArray(run.invocations) && run.invocations.length > 0 &&
      run.invocations.every((invocation) => record(invocation) && invocation.executionSuccessful === true));
    const rules = run.tool.driver.rules;
    const byId = new Map();
    for (const rule of rules) {
      requireEvidence(record(rule) && safeId(rule.id) && !byId.has(rule.id));
      byId.set(rule.id, rule);
    }
    for (const result of run.results) {
      requireEvidence(record(result));
      const indexed = result.ruleIndex === undefined ? undefined : rules[result.ruleIndex];
      if (result.ruleIndex !== undefined)
        requireEvidence(Number.isSafeInteger(result.ruleIndex) && result.ruleIndex >= 0 && indexed !== undefined);
      const rule = result.ruleId === undefined ? indexed : byId.get(result.ruleId);
      requireEvidence(rule !== undefined && (indexed === undefined || rule.id === indexed.id));
      const raw = rule.properties?.['security-severity'];
      if (raw !== undefined) {
        requireEvidence((typeof raw === 'number' || (typeof raw === 'string' && /^(?:\d|10)(?:\.\d+)?$/.test(raw))) &&
          Number.isFinite(Number(raw)) && Number(raw) >= 0 && Number(raw) <= 10);
        if (Number(raw) >= 7) blocking.add(rule.id);
      } else {
        // Security results without a usable classification cannot become a
        // clean gate. No allowlist or suppression bypass is installed.
        requireEvidence(!rule.properties?.tags?.includes('security'));
      }
      results++;
    }
  }
  return { results, blockingRules: [...blocking].sort() };
}

function main(directory) {
  try {
    requireEvidence(typeof directory === 'string' && directory.length > 0);
    const root = resolve(directory);
    const files = readdirSync(root).filter((file) => file.endsWith('.sarif')).sort();
    requireEvidence(files.length > 0 && files.length <= 8);
    let count = 0;
    const blocked = new Set();
    for (const file of files) {
      const path = join(root, file), stat = lstatSync(path);
      requireEvidence(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 20 * 1024 * 1024);
      const result = inspectSarif(JSON.parse(readFileSync(path, 'utf8')));
      count += result.results;
      for (const rule of result.blockingRules) blocked.add(rule);
    }
    console.log(`CodeQL evidence: ${files.length} reports, ${count} results, ${blocked.size} High/Critical rules.`);
    if (blocked.size) {
      console.error('CodeQL release gate blocked: ' + [...blocked].sort().join(', '));
      process.exitCode = 1;
    }
  } catch {
    // Never echo SARIF snippets, input paths, source values or raw tool errors.
    console.error('CodeQL release gate failed closed: invalid or unavailable analysis evidence.');
    process.exitCode = 1;
  }
}
if (require.main === module) main(process.argv.length === 3 ? process.argv[2] : undefined);
module.exports = { inspectSarif, main };
