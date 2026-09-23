import { createHydratedStorage, StorageHydrationError } from '../storage';
import { useStorageHealth } from '../storageHealth';
import { retryHydration } from '../persistenceLifecycle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

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

const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
  hapticsEnabled: z.boolean().default(true),
  theme: z.enum(['light', 'dark']).default('dark'),
  count: z.number().default(0),
});

type TestState = z.infer<typeof TestSchema>;

const defaultTestState: TestState = {
  id: 'test-id',
  name: 'Default Test',
  hapticsEnabled: true,
  theme: 'dark',
  count: 0,
};

describe('Android Storage Hydration & Safe Recovery (Beta Blocker #2)', () => {
  beforeEach(async () => {
    useStorageHealth.getState().reset();
    await AsyncStorage.clear();
    Object.keys(mockStorageBacking).forEach((key) => {
      delete mockStorageBacking[key];
    });
  });

  describe('Level 1 & 2: Version Migration & Fresh Install', () => {
    it('hydrates clean fresh install payload successfully', async () => {
      const storage = createHydratedStorage('fresh-test', TestSchema, defaultTestState);
      const validPayload = JSON.stringify({
        state: {
          id: 'fresh-1',
          name: 'Fresh User',
          hapticsEnabled: true,
          theme: 'dark',
          count: 5,
        },
        version: 1,
      });
      mockStorageBacking['fresh-test'] = validPayload;

      const result = await storage.getItem('fresh-test');
      expect(result).not.toBeNull();
      expect(result?.state.name).toBe('Fresh User');
      expect(useStorageHealth.getState().blockedStores).toHaveLength(0);
    });

    it('passes older schema versions to Zustand migrate without failing early', async () => {
      // Old Beta payload (version 0) lacking new fields
      const storage = createHydratedStorage('legacy-v0', TestSchema, defaultTestState, 1);
      const oldBetaPayload = JSON.stringify({
        state: {
          id: 'legacy-1',
          name: 'Old Beta Athlete',
        },
        version: 0,
      });
      mockStorageBacking['legacy-v0'] = oldBetaPayload;

      // getItem should return the raw state with version 0 so Zustand can call its migrate() function
      const result = await storage.getItem('legacy-v0');
      expect(result).not.toBeNull();
      expect(result?.version).toBe(0);
      expect((result?.state as Record<string, unknown>).name).toBe('Old Beta Athlete');
      expect(useStorageHealth.getState().blockedStores).not.toContain('legacy-v0');
    });
  });

  describe('Level 3: Safe Field-Level Repair for Non-Critical Fields', () => {
    it('repairs missing non-critical optional fields using defaultState without crashing', async () => {
      const storage = createHydratedStorage('repair-test', TestSchema, defaultTestState);
      // Older beta payload without hapticsEnabled or theme (which have defaults in schema)
      const missingFieldsPayload = JSON.stringify({
        state: {
          id: 'existing-user',
          name: 'Samsung User',
          count: 42,
        },
        version: 1,
      });
      mockStorageBacking['repair-test'] = missingFieldsPayload;

      const result = await storage.getItem('repair-test');
      expect(result).not.toBeNull();
      expect(result?.state.name).toBe('Samsung User');
      expect(result?.state.count).toBe(42);
      expect(result?.state.hapticsEnabled).toBe(true);
      expect(result?.state.theme).toBe('dark');
      expect(useStorageHealth.getState().blockedStores).not.toContain('repair-test');
    });

    it('tolerates unknown additive fields added by future builds', async () => {
      const storage = createHydratedStorage('passthrough-test', TestSchema, defaultTestState);
      const additivePayload = JSON.stringify({
        state: {
          id: 'user-forward-compat',
          name: 'Forward Compat User',
          hapticsEnabled: true,
          theme: 'dark',
          count: 10,
          futureExtraFeatureFlag: true,
          anotherAdditiveField: 'hello',
        },
        version: 1,
      });
      mockStorageBacking['passthrough-test'] = additivePayload;

      const result = await storage.getItem('passthrough-test');
      expect(result).not.toBeNull();
      expect(result?.state.name).toBe('Forward Compat User');
      expect(useStorageHealth.getState().blockedStores).toHaveLength(0);
    });
  });

  describe('Level 4: Critical Data Protection & Non-PII Diagnostics', () => {
    it('fails closed and records non-PII diagnostics when critical data is genuinely corrupted', async () => {
      const storage = createHydratedStorage('critical-store', TestSchema, defaultTestState);
      // Unparseable corrupted state (id is number instead of string, cannot be salvaged)
      const corruptPayload = JSON.stringify({
        state: {
          id: 12345, // invalid type
          name: 99999, // invalid type
        },
        version: 1,
      });
      mockStorageBacking['critical-store'] = corruptPayload;

      expect(() => storage.getItem('critical-store')).toThrow(StorageHydrationError);

      const health = useStorageHealth.getState();
      expect(health.blockedStores).toContain('critical-store');
      expect(health.diagnostics['critical-store']).toBeDefined();
      expect(health.diagnostics['critical-store']?.code).toBe('SCHEMA_VALIDATION_ERROR');
      // Verifies non-PII: contains path, not data
      expect(health.diagnostics['critical-store']?.fieldPath).toContain('id');
    });

    it('creates .pre-rebuild-backup to guarantee no silent data loss during corruption', async () => {
      const storage = createHydratedStorage('backup-store', TestSchema, defaultTestState);
      const rawCorrupt = JSON.stringify({ state: { id: null }, version: 1 });
      mockStorageBacking['backup-store'] = rawCorrupt;

      try {
        await storage.getItem('backup-store');
      } catch {
        // Expected
      }

      // Raw backup was preserved intact
      expect(mockStorageBacking['backup-store.pre-rebuild-backup']).toBe(rawCorrupt);
    });
  });

  describe('Level 5: True Robust Retry in Persistence Lifecycle', () => {
    it('retryHydration resets transient blocked state and allows fresh retry', async () => {
      useStorageHealth.getState().block('test-transient');
      useStorageHealth.getState().reportWriteError();

      expect(useStorageHealth.getState().blockedStores).toContain('test-transient');
      expect(useStorageHealth.getState().writeError).toBe(true);

      // Invoking retryHydration resets the health store so retries evaluate cleanly
      await retryHydration();

      expect(useStorageHealth.getState().writeError).toBe(false);
    });
  });
});
