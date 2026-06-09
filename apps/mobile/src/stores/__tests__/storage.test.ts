import { z } from 'zod';
import { StorageValue } from 'zustand/middleware';

import { createHydratedStorage } from '../storage';

const mockStorageBacking: Record<string, string> = {};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn((key: string, value: string) => {
      mockStorageBacking[key] = value;
    }),
    getString: jest.fn((key: string) => mockStorageBacking[key]),
    delete: jest.fn((key: string) => {
      delete mockStorageBacking[key];
    }),
  })),
}));

interface PersistedFixture {
  count: number;
  updatedAt: Date;
}

const persistedFixtureSchema = z.object({
  count: z.number().int().nonnegative(),
  updatedAt: z.coerce.date(),
});

const defaultPersistedState: PersistedFixture = {
  count: 0,
  updatedAt: new Date('2026-06-01T00:00:00.000Z'),
};

describe('createHydratedStorage', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    Object.keys(mockStorageBacking).forEach((key) => {
      delete mockStorageBacking[key];
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('revives date strings from persisted JSON', async () => {
    const storage = createHydratedStorage(
      'test-storage',
      persistedFixtureSchema,
      defaultPersistedState,
    );

    const value: StorageValue<PersistedFixture> = {
      state: {
        count: 2,
        updatedAt: new Date('2026-06-02T10:00:00.000Z'),
      },
      version: 1,
    };

    storage.setItem('fixture', value);
    const hydrated = await Promise.resolve(storage.getItem('fixture'));

    expect(hydrated?.state.updatedAt).toBeInstanceOf(Date);
    expect(hydrated?.state.count).toBe(2);
  });

  it('falls back to defaults when persisted state fails Zod validation', async () => {
    const storage = createHydratedStorage(
      'test-storage',
      persistedFixtureSchema,
      defaultPersistedState,
    );
    const invalidValue: StorageValue<unknown> = {
      state: {
        count: -1,
        updatedAt: 'not-a-date',
      },
      version: 1,
    };

    mockStorageBacking.fixture = JSON.stringify(invalidValue);
    const hydrated = await Promise.resolve(storage.getItem('fixture'));

    expect(hydrated?.state).toEqual(defaultPersistedState);
  });
});
