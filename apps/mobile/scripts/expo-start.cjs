const { spawn } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const expoCli = path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
const args = ['start', ...process.argv.slice(2)];

const startProcess = spawn(process.execPath, [expoCli, ...args], {
  cwd: projectRoot,
  env: {
    ...process.env,
    ...(args.includes('--dev-client') ? { APP_VARIANT: process.env.APP_VARIANT || 'development' } : {}),
    EXPO_NO_TELEMETRY: process.env.EXPO_NO_TELEMETRY || '1',
  },
  stdio: 'inherit',
});

const stopStart = () => {
  if (!startProcess.killed) {
    startProcess.kill();
  }
};

process.on('SIGINT', () => {
  stopStart();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopStart();
  process.exit(143);
});

startProcess.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0);
  }
  process.exit(code ?? 0);
});
