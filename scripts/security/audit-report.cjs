const { spawnSync } = require('node:child_process');

const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function isValidAuditReport(audit) {
  if (!isRecord(audit) || Object.hasOwn(audit, 'error') || !isRecord(audit.metadata) || !isRecord(audit.advisories)) {
    return false;
  }
  const counts = audit.metadata.vulnerabilities;
  if (!isRecord(counts)) return false;
  for (const severity of severities) {
    if (['info', 'low'].includes(severity) && !Object.hasOwn(counts, severity)) continue;
    if (!Number.isSafeInteger(counts[severity]) || counts[severity] < 0) return false;
  }

  const reportedSeverities = new Set();
  for (const advisory of Object.values(audit.advisories)) {
    if (!isRecord(advisory) || !severities.includes(advisory.severity) ||
        typeof advisory.module_name !== 'string' || advisory.module_name.trim() === '') {
      return false;
    }
    reportedSeverities.add(advisory.severity);
  }
  // A positive summary without details cannot be reviewed. Counts may include
  // multiple installed versions, so they need not equal the advisory count.
  return severities.every((severity) => !counts[severity] || reportedSeverities.has(severity));
}

function parseAuditReport(output) {
  try {
    const audit = JSON.parse(output);
    return isValidAuditReport(audit) ? audit : null;
  } catch {
    return null;
  }
}

function runPnpmAudit({ fixture, spawn = spawnSync } = {}) {
  if (fixture !== undefined) return parseAuditReport(fixture);

  const options = {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: process.env,
    timeout: 180000,
  };
  let result;
  try {
    result = process.platform === 'win32'
      ? spawn('pnpm audit --json', { ...options, shell: true })
      : spawn('pnpm', ['audit', '--json'], options);
  } catch {
    return null;
  }
  // pnpm returns 1 for completed audits with vulnerabilities. Spawn failures,
  // timeouts and other process failures are not successful audit evidence.
  if (result.error || result.signal || ![0, 1].includes(result.status)) return null;
  return parseAuditReport(result.stdout);
}

module.exports = { isValidAuditReport, runPnpmAudit };
