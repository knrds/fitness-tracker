import { DiagnosticsService } from '../diagnosticsService';

describe('DiagnosticsService (Privacy-Safe Telemetry & Feature Flags)', () => {
  let diagnostics: DiagnosticsService;

  beforeEach(() => {
    diagnostics = new DiagnosticsService();
  });

  test('Test 1: Default feature flags are all active so no beta features are disabled', () => {
    const flags = diagnostics.getFeatureFlags();
    expect(flags.coachEnabled).toBe(true);
    expect(flags.exerciseMediaEnabled).toBe(true);
    expect(flags.cloudSyncEnabled).toBe(true);
    expect(flags.subscriptionsEnabled).toBe(true);
  });

  test('Test 2: Feature flag kill-switch toggle functions dynamically', () => {
    diagnostics.setFeatureFlag('coachEnabled', false);
    expect(diagnostics.isFeatureEnabled('coachEnabled')).toBe(false);
    expect(diagnostics.isFeatureEnabled('exerciseMediaEnabled')).toBe(true);

    diagnostics.resetFeatureFlags();
    expect(diagnostics.isFeatureEnabled('coachEnabled')).toBe(true);
  });

  test('Test 3: Event recording respects ring buffer limit (max 50 events)', () => {
    for (let i = 1; i <= 60; i++) {
      diagnostics.recordEvent('app_start', `INIT_BOOT_${i}`);
    }

    const events = diagnostics.getRecentEvents();
    expect(events).toHaveLength(50);
    // Oldest 10 pruned
    expect(events[0]!.code).toBe('INIT_BOOT_11');
    expect(events[49]!.code).toBe('INIT_BOOT_60');
  });

  test('Test 4: Error codes extraction filters non-sensitive technical errors', () => {
    diagnostics.recordEvent('app_start', 'BOOT_OK');
    diagnostics.recordEvent('sync_failure', 'ERR_NETWORK_TIMEOUT');
    diagnostics.recordEvent('coach_failure', 'ERR_AI_429');

    const snapshot = diagnostics.getDiagnosticsSnapshot();
    expect(snapshot.recentErrorCodes).toEqual(['ERR_NETWORK_TIMEOUT', 'ERR_AI_429']);
  });

  test('Test 5: Support report contains zero PII, passwords, weights, or message content', () => {
    diagnostics.recordEvent('auth_error', 'ERR_AUTH_EXPIRED');

    const report = diagnostics.generateSupportReport();
    const parsed = JSON.parse(report);

    expect(parsed._reportType).toBe('EVARO_SUPPORT_DIAGNOSTICS');
    expect(parsed.appVersion).toBeDefined();
    expect(parsed.featureFlags).toBeDefined();
    expect(parsed.recentErrorCodes).toContain('ERR_AUTH_EXPIRED');

    // Strict PII checks
    expect(report).not.toContain('password');
    expect(report).not.toContain('access_token');
    expect(report).not.toContain('weightKg');
    expect(report).not.toContain('benchPressMaxKg');
    expect(report).not.toContain('@evaro.app');
  });
});
