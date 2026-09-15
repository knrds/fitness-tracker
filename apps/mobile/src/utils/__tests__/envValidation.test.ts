import { validateEnvironment } from '../envValidation';

describe('validateEnvironment', () => {
  it('detects unconfigured supabase in offline mode', () => {
    const result = validateEnvironment(false, {});
    expect(result.supabaseConfigured).toBe(false);
    expect(result.coachChatConfigured).toBe(false);
    expect(result.missingRecommended).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(result.missingRecommended).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('detects placeholder supabase credentials', () => {
    const result = validateEnvironment(false, {
      EXPO_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'placeholder',
    });
    expect(result.supabaseConfigured).toBe(false);
    expect(result.missingRecommended).toHaveLength(2);
  });

  it('detects configured supabase credentials', () => {
    const result = validateEnvironment(false, {
      EXPO_PUBLIC_SUPABASE_URL: 'https://custom-project.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'real-anon-key-value',
    });
    expect(result.supabaseConfigured).toBe(true);
    expect(result.coachChatConfigured).toBe(true);
    expect(result.missingRecommended).toHaveLength(0);
  });

  it('detects standalone coach chat endpoint', () => {
    const result = validateEnvironment(false, {
      EXPO_PUBLIC_COACH_CHAT_ENDPOINT: 'https://coach.example.com/api',
    });
    expect(result.coachChatConfigured).toBe(true);
    expect(result.supabaseConfigured).toBe(false);
  });
});
