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
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
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
  it('explains exhausted OpenRouter credits without showing raw provider text', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 402,
        json: async () => ({ code: 'PROVIDER_CREDITS', error: 'untrusted provider details' }),
      });
    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse([], {
        profile: { displayName: 'Test', preferredUnits: 'metric' },
        stats: { totalWorkouts: 0, currentStreak: 0 },
      }).next(),
    ).rejects.toThrow('OpenRouter-Guthaben');
  });

  it('handles client cancellation via AbortSignal gracefully', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    const abortController = new AbortController();
    abortController.abort();

    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error('The user aborted a request.');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse(
        [],
        {
          profile: { displayName: 'Test', preferredUnits: 'metric' },
          stats: { totalWorkouts: 0, currentStreak: 0 },
        },
        { signal: abortController.signal },
      ).next(),
    ).rejects.toThrow('Anfrage durch Nutzer abgebrochen.');
  });

  it('handles request timeout with explicit message', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    global.fetch = jest.fn().mockImplementation((_url, options) => {
      return new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse(
        [],
        {
          profile: { displayName: 'Test', preferredUnits: 'metric' },
          stats: { totalWorkouts: 0, currentStreak: 0 },
        },
        { timeoutMs: 10 },
      ).next(),
    ).rejects.toThrow('Der Coach antwortet nicht rechtzeitig.');
  });

  it('handles network connection failure (TypeError) with user-friendly connectivity message', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse([], {
        profile: { displayName: 'Test', preferredUnits: 'metric' },
        stats: { totalWorkouts: 0, currentStreak: 0 },
      }).next(),
    ).rejects.toThrow('Der Coach ist nicht erreichbar. Bitte Internetverbindung und Backend-URL prüfen.');
  });

  it('handles HTTP 429 rate limit response with explicit guidance', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    });

    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse([], {
        profile: { displayName: 'Test', preferredUnits: 'metric' },
        stats: { totalWorkouts: 0, currentStreak: 0 },
      }).next(),
    ).rejects.toThrow('Das Anfrage-Limit ist erreicht. Bitte später erneut versuchen.');
  });

  it('rejects malformed response with empty reply field', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ reply: '   ' }),
    });

    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    await expect(
      streamCoachResponse([], {
        profile: { displayName: 'Test', preferredUnits: 'metric' },
        stats: { totalWorkouts: 0, currentStreak: 0 },
      }).next(),
    ).rejects.toThrow('Das Coach-Backend hat keine Antwort geliefert.');
  });

  it('never transmits provider secrets or API keys in outgoing client request headers or body', async () => {
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
    let capturedOptions: RequestInit | undefined;
    global.fetch = jest.fn().mockImplementation((_url, init) => {
      capturedOptions = init;
      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify({ reply: 'Valid answer' }),
      });
    });

    const { streamCoachResponse } = jest.requireActual<typeof import('../coachApi')>('../coachApi');
    const generator = streamCoachResponse(
      [{ id: '1', role: 'user', content: 'Workout help', createdAt: new Date() }],
      {
        profile: { displayName: 'SecureUser', preferredUnits: 'metric' },
        stats: { totalWorkouts: 5, currentStreak: 1 },
      },
    );
    await generator.next();
    await generator.return(undefined);

    expect(capturedOptions).toBeDefined();
    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['openrouter-api-key']).toBeUndefined();

    const bodyStr = capturedOptions?.body as string;
    expect(bodyStr).not.toContain('sk-or-');
    expect(bodyStr).not.toContain('OPENROUTER');
    expect(bodyStr).not.toContain('secret');
  });
});
