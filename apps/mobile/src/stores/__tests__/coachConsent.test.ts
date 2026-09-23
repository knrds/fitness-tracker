import { useCoachStore } from '../coachStore';
import { useProfileStore } from '../profileStore';
import {
  hasValidAiConsent,
  CURRENT_AI_CONSENT_VERSION,
} from '@fitness-tracker/domain';
import {
  beginScopeChange,
  completeScopeChange,
  selectStoragePartition,
} from '../../data/storageScope';

jest.mock('expo-crypto', () => {
  let sequence = 0;
  return { randomUUID: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` };
});

const mockStreamCoachResponse = jest.fn();
const mockCheckConnectivity = jest.fn().mockResolvedValue(true);

jest.mock('../../utils/coachApi', () => ({
  streamCoachResponse: (...args: unknown[]) => mockStreamCoachResponse(...args),
  checkConnectivity: () => mockCheckConnectivity(),
}));

describe('AI Consent Guard (Task 04.03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.setState({
      messages: [],
      isSending: false,
      isOnline: true,
      error: null,
    });
    useProfileStore.setState((state) => ({
      profile: {
        ...state.profile,
        aiConsent: undefined,
      },
    }));
  });

  it('1. no consent -> kein Provider Request, fail closed with error', async () => {
    expect(useProfileStore.getState().profile.aiConsent).toBeUndefined();
    expect(hasValidAiConsent(useProfileStore.getState().profile.aiConsent)).toBe(false);

    await useCoachStore.getState().sendMessage('Hello AI Coach');

    expect(mockStreamCoachResponse).not.toHaveBeenCalled();
    expect(useCoachStore.getState().isSending).toBe(false);
    expect(useCoachStore.getState().error).toContain('AI_CONSENT_REQUIRED');
  });

  it('2. accepted -> Request möglich', async () => {
    async function* mockStream() {
      yield 'Hello athlete!';
    }
    mockStreamCoachResponse.mockReturnValue(mockStream());

    useProfileStore.getState().setAiConsent(CURRENT_AI_CONSENT_VERSION);
    expect(hasValidAiConsent(useProfileStore.getState().profile.aiConsent)).toBe(true);

    await useCoachStore.getState().sendMessage('Hello AI Coach');

    expect(mockStreamCoachResponse).toHaveBeenCalledTimes(1);
    expect(useCoachStore.getState().error).toBeNull();
  });

  it('3. revoked -> Request blockiert', async () => {
    // First grant consent
    useProfileStore.getState().setAiConsent(CURRENT_AI_CONSENT_VERSION);
    expect(hasValidAiConsent(useProfileStore.getState().profile.aiConsent)).toBe(true);

    // Then revoke consent
    useProfileStore.getState().revokeAiConsent();
    const consent = useProfileStore.getState().profile.aiConsent;
    expect(consent?.revokedAt).toBeDefined();
    expect(hasValidAiConsent(consent)).toBe(false);

    await useCoachStore.getState().sendMessage('Hello AI Coach');

    expect(mockStreamCoachResponse).not.toHaveBeenCalled();
    expect(useCoachStore.getState().error).toContain('AI_CONSENT_REQUIRED');
  });

  it('4. outdated consent version -> erneute Zustimmung erforderlich', async () => {
    // Persist an older consent version (e.g. 0)
    useProfileStore.setState((state) => ({
      profile: {
        ...state.profile,
        aiConsent: {
          version: CURRENT_AI_CONSENT_VERSION - 1,
          consentedAt: new Date(2025, 0, 1).toISOString(),
        },
      },
    }));

    const outdated = useProfileStore.getState().profile.aiConsent;
    expect(hasValidAiConsent(outdated, CURRENT_AI_CONSENT_VERSION)).toBe(false);

    await useCoachStore.getState().sendMessage('Hello AI Coach');
    expect(mockStreamCoachResponse).not.toHaveBeenCalled();
    expect(useCoachStore.getState().error).toContain('AI_CONSENT_REQUIRED');

    // Upgrade consent to current version
    useProfileStore.getState().setAiConsent(CURRENT_AI_CONSENT_VERSION);
    expect(hasValidAiConsent(useProfileStore.getState().profile.aiConsent, CURRENT_AI_CONSENT_VERSION)).toBe(true);
  });

  it('5. account switch -> keine Consent-Vererbung (partition isolation)', async () => {
    // User A grants consent
    useProfileStore.getState().setAiConsent(CURRENT_AI_CONSENT_VERSION);
    expect(hasValidAiConsent(useProfileStore.getState().profile.aiConsent)).toBe(true);

    // Switch account partition from User A to User B
    const gen = beginScopeChange();
    selectStoragePartition('account:user-b-uuid', gen);
    completeScopeChange(gen);

    // In a clean User B profile state, consent is not inherited
    useProfileStore.setState((state) => ({
      profile: {
        ...state.profile,
        aiConsent: undefined,
      },
    }));

    expect(hasValidAiConsent(useProfileStore.getState().profile.aiConsent)).toBe(false);
    await useCoachStore.getState().sendMessage('Query from User B');
    expect(mockStreamCoachResponse).not.toHaveBeenCalled();
    expect(useCoachStore.getState().error).toContain('AI_CONSENT_REQUIRED');
  });

  it('6. malformed persisted consent -> fail closed', () => {
    expect(hasValidAiConsent(null)).toBe(false);
    expect(hasValidAiConsent(undefined)).toBe(false);
    expect(hasValidAiConsent({})).toBe(false);
    expect(hasValidAiConsent({ version: 'one' })).toBe(false);
    expect(hasValidAiConsent({ version: 1, consentedAt: 12345 })).toBe(false);
    expect(hasValidAiConsent({ version: -1, consentedAt: 'now' })).toBe(false);
    expect(hasValidAiConsent({ version: CURRENT_AI_CONSENT_VERSION, consentedAt: 'now', revokedAt: 'later' })).toBe(false);
    expect(hasValidAiConsent('consented')).toBe(false);
    expect(hasValidAiConsent(true)).toBe(false);
  });
});
