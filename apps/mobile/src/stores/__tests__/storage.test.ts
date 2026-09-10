import { z } from 'zod';
import { StorageValue } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearStorageBackups, createHydratedStorage, StorageHydrationError } from '../storage';
import { useStorageHealth } from '../storageHealth';

const mockStorageBacking: Record<string, string> = {};
let mockShouldThrowMMKV = false;

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => {
    if (mockShouldThrowMMKV) {
      throw new Error('MMKV unavailable');
    }

    return {
      set: jest.fn((key: string, value: string) => {
        mockStorageBacking[key] = value;
      }),
      getString: jest.fn((key: string) => mockStorageBacking[key]),
      delete: jest.fn((key: string) => {
        delete mockStorageBacking[key];
      }),
    };
  }),
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

  beforeEach(async () => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockShouldThrowMMKV = false;
    useStorageHealth.setState({ blockedStores: [] });
    await AsyncStorage.clear();
    Object.keys(mockStorageBacking).forEach((key) => {
      delete mockStorageBacking[key];
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('deletes recovery backups on explicit local-data reset', async () => {
    const raw = JSON.stringify({ state: defaultPersistedState, version: 1 });
    mockStorageBacking.fixture = raw;
    const storage = createHydratedStorage(
      'test-storage',
      persistedFixtureSchema,
      defaultPersistedState,
    );
    await storage.getItem('fixture');
    expect(mockStorageBacking['fixture.pre-rebuild-backup']).toBe(raw);
    await clearStorageBackups();
    expect(mockStorageBacking['fixture.pre-rebuild-backup']).toBeUndefined();
    expect(mockStorageBacking.fixture).toBe(raw);
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

    await storage.getItem('fixture');
    storage.setItem('fixture', value);
    const hydrated = await Promise.resolve(storage.getItem('fixture'));

    expect(hydrated?.state.updatedAt).toBeInstanceOf(Date);
    expect(hydrated?.state.count).toBe(2);
  });

  it('preserves and locks invalid data instead of resetting it to defaults', async () => {
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
    expect(() => storage.getItem('fixture')).toThrow(StorageHydrationError);
    storage.setItem('fixture', { state: defaultPersistedState });
    storage.removeItem('fixture');
    expect(mockStorageBacking.fixture).toBe(JSON.stringify(invalidValue));
    expect(mockStorageBacking['fixture.pre-rebuild-backup']).toBe(JSON.stringify(invalidValue));
    expect(useStorageHealth.getState().blockedStores).toContain('test-storage');
  });

  it('falls back to AsyncStorage when MMKV is unavailable', async () => {
    mockShouldThrowMMKV = true;
    const storage = createHydratedStorage(
      'test-storage',
      persistedFixtureSchema,
      defaultPersistedState,
    );
    const value: StorageValue<PersistedFixture> = {
      state: {
        count: 7,
        updatedAt: new Date('2026-06-04T12:00:00.000Z'),
      },
      version: 1,
    };

    await storage.getItem('fixture');
    await Promise.resolve(storage.setItem('fixture', value));
    const hydrated = await Promise.resolve(storage.getItem('fixture'));

    expect(await AsyncStorage.getItem('fixture')).toBe(JSON.stringify(value));
    expect(hydrated?.state.count).toBe(7);
    expect(hydrated?.state.updatedAt).toBeInstanceOf(Date);
  });

  it.each(['{broken', JSON.stringify({ state: defaultPersistedState, version: 999 })])(
    'protects malformed or future-version data: %s',
    (raw) => {
      mockStorageBacking.fixture = raw;
      const storage = createHydratedStorage(
        'test-storage',
        persistedFixtureSchema,
        defaultPersistedState,
      );
      expect(() => storage.getItem('fixture')).toThrow(StorageHydrationError);
      storage.setItem('fixture', { state: defaultPersistedState });
      expect(mockStorageBacking.fixture).toBe(raw);
    },
  );

  it('blocks writes during async hydration and retains the first backup on retry', async () => {
    mockShouldThrowMMKV = true;
    const raw = JSON.stringify({ state: { ...defaultPersistedState, count: 9 }, version: 1 });
    await AsyncStorage.setItem('fixture', raw);
    const storage = createHydratedStorage(
      'test-storage',
      persistedFixtureSchema,
      defaultPersistedState,
    );
    const reading = storage.getItem('fixture');
    await storage.setItem('fixture', { state: defaultPersistedState });
    expect((await reading)?.state.count).toBe(9);
    expect(await AsyncStorage.getItem('fixture')).toBe(raw);
    await storage.setItem('fixture', { state: defaultPersistedState, version: 1 });
    await storage.getItem('fixture');
    expect(await AsyncStorage.getItem('fixture.pre-rebuild-backup')).toBe(raw);
  });

  it('uses schema transformations without converting ISO text notes to dates', async () => {
    const schema = z.object({ note: z.string(), count: z.number().default(0) });
    const raw = JSON.stringify({ state: { note: '2026-09-10T10:00:00.000Z' }, version: 0 });
    mockStorageBacking.fixture = raw;
    const storage = createHydratedStorage('test-storage', schema, { note: '', count: 0 });
    expect((await storage.getItem('fixture'))?.state).toEqual({
      note: '2026-09-10T10:00:00.000Z',
      count: 0,
    });
  });

  it('preserves invalid AsyncStorage bytes and permits retry after repair', async () => {
    mockShouldThrowMMKV = true;
    await AsyncStorage.setItem('fixture', '{broken');
    const storage = createHydratedStorage(
      'test-storage',
      persistedFixtureSchema,
      defaultPersistedState,
    );
    await expect(storage.getItem('fixture')).rejects.toThrow(StorageHydrationError);
    await storage.setItem('fixture', { state: defaultPersistedState });
    expect(await AsyncStorage.getItem('fixture')).toBe('{broken');
    await AsyncStorage.setItem(
      'fixture',
      JSON.stringify({ state: defaultPersistedState, version: 1 }),
    );
    await storage.getItem('fixture');
    expect(useStorageHealth.getState().blockedStores).toEqual([]);
    expect(await AsyncStorage.getItem('fixture.pre-rebuild-backup')).toBe('{broken');
  });
});
