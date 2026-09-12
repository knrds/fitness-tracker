const mockInvoke = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
  isSupabaseConfigured: false,
}));

describe('coachApi', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('streams replies from a configured coach endpoint', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    process.env.EXPO_PUBLIC_COACH_MODEL = 'test-model';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify({ reply: 'Endpoint reply' })),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { streamCoachResponse, checkConnectivity } =
      jest.requireActual<typeof import('../coachApi')>('../coachApi');

    await expect(checkConnectivity()).resolves.toBe(true);

    const chunks: string[] = [];
    const stream = streamCoachResponse(
      [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          role: 'user',
          content: 'Review my squat',
          createdAt: new Date('2026-06-23T12:00:00Z'),
        },
      ],
      {
        profile: {
          displayName: 'Konrad',
          preferredUnits: 'metric',
        },
        stats: {
          totalWorkouts: 12,
          currentStreak: 3,
        },
      },
    );

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.at(-1)).toBe('Endpoint reply');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://coach.example.test/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Review my squat'),
      }),
    );
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('surfaces server failures instead of inventing a local reply', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse([], {
        profile: { displayName: 'Test', preferredUnits: 'metric' },
        stats: { totalWorkouts: 0, currentStreak: 0 },
      }).next(),
    ).rejects.toThrow('nicht vollständig eingerichtet');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('rejects an HTML preview page instead of showing it as a coach response', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, text: async () => '<html>preview</html>' });
    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse([], {
        profile: { displayName: 'Test', preferredUnits: 'metric' },
        stats: { totalWorkouts: 0, currentStreak: 0 },
      }).next(),
    ).rejects.toThrow('JSON');
  });
});
