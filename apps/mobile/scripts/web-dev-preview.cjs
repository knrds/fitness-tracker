const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const port = process.env.PORT || '8081';
const expoCli = path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
const commandOptions = {
  cwd: projectRoot,
  env: {
    ...process.env,
    EXPO_NO_DEPENDENCY_VALIDATION: process.env.EXPO_NO_DEPENDENCY_VALIDATION || '1',
    EXPO_NO_TELEMETRY: process.env.EXPO_NO_TELEMETRY || '1',
  },
  stdio: 'inherit',
};

console.log('[web] Building a static Expo web preview...');
console.log('[web] Note: Expo SDK 54 static `expo start --web` currently hangs for this app.');
console.log('[web] Use `pnpm --filter @fitness-tracker/mobile dev:metro` only for diagnosing that path.');

const exportResult = spawnSync(
  process.execPath,
  [expoCli, 'export', '--platform', 'web'],
  commandOptions,
);

if (exportResult.error) {
  console.error(exportResult.error);
  process.exit(1);
}

if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

console.log(`[web] Serving apps/mobile/dist on http://localhost:${port}`);

const serveProcess = spawn(process.execPath, [expoCli, 'serve', '--port', port], commandOptions);

const stopServe = () => {
  if (!serveProcess.killed) {
    serveProcess.kill();
  }
};

process.on('SIGINT', () => {
  stopServe();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopServe();
  process.exit(143);
});

serveProcess.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0);
  }
  process.exit(code ?? 0);
});
