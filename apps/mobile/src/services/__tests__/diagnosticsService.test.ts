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

  test('Test 6: Secret pattern redaction strips Bearer tokens, JWTs, and Supabase credentials', () => {
    const rawJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const rawBearer = 'Bearer eyJsecretToken123456789';
    const supabaseUrlWithToken = 'https://my-project-id.supabase.co/rest/v1/users?apikey=eyJhbGciOiJIUzI1NiJ9';

    diagnostics.recordEvent('auth_error', `Failed with ${rawBearer} and ${rawJwt} on ${supabaseUrlWithToken}`);

    const events = diagnostics.getRecentEvents();
    expect(events).toHaveLength(1);
    const recordedCode = events[0]!.code;

    expect(recordedCode).not.toContain(rawJwt);
    expect(recordedCode).not.toContain('Bearer eyJsecretToken');
    expect(recordedCode).not.toContain('my-project-id.supabase.co');
    expect(recordedCode).toContain('[REDACTED_BEARER]');
    expect(recordedCode).toContain('[REDACTED_JWT]');
    expect(recordedCode).toContain('https://[REDACTED].supabase.co');
  });

  test('Test 7: Email address redaction prevents any user emails from entering diagnostics', () => {
    diagnostics.recordEvent('auth_error', 'Login failure for user konrad.test@example.com on device');

    const events = diagnostics.getRecentEvents();
    const recordedCode = events[0]!.code;

    expect(recordedCode).not.toContain('konrad.test@example.com');
    expect(recordedCode).toContain('[REDACTED_EMAIL]');
  });

  test('Test 8: Blocked metadata keys strip coach content, workout names, body values, and measurements', () => {
    diagnostics.recordEvent('coach_failure', 'ERR_COACH_TIMEOUT', {
      coachMessage: 'How do I increase my bench press?',
      prompt: 'Act as a strength coach and review my squat',
      workoutName: 'Heavy Leg Day',
      weightKg: 82.5,
      bodyFat: 14.2,
      measurement: 38.5,
      auth: 'secret-auth-payload',
      safeTechnicalCode: 'NET_ERR_CONNRESET',
      httpStatus: 504,
      isRetryable: true,
    });

    const events = diagnostics.getRecentEvents();
    const meta = events[0]!.meta!;

    expect(meta).toBeDefined();
    expect(meta.coachMessage).toBeUndefined();
    expect(meta.prompt).toBeUndefined();
    expect(meta.workoutName).toBeUndefined();
    expect(meta.weightKg).toBeUndefined();
    expect(meta.bodyFat).toBeUndefined();
    expect(meta.measurement).toBeUndefined();
    expect(meta.auth).toBeUndefined();

    // Safe technical metadata is preserved
    expect(meta.safeTechnicalCode).toBe('NET_ERR_CONNRESET');
    expect(meta.httpStatus).toBe(504);
    expect(meta.isRetryable).toBe(true);

    const report = diagnostics.generateSupportReport();
    expect(report).not.toContain('bench press');
    expect(report).not.toContain('Heavy Leg Day');
    expect(report).not.toContain('82.5');
  });
});
