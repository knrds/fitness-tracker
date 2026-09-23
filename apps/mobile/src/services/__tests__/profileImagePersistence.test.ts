import {
  persistAvatar,
  resolveAvatarUri,
  migrateLegacyAvatar,
  deleteAvatarForPartition,
} from '../avatarStorageService';
import { Platform } from 'react-native';

const TEST_DOC_DIR = 'file:///var/mobile/Containers/Data/Application/1234-UUID/Documents/';

type MockFileEntry = { content?: string; exists: boolean };
type MockGlobal = typeof globalThis & {
  __mockFileStore: Map<string, MockFileEntry>;
};

const g = globalThis as unknown as MockGlobal;
g.__mockFileStore = new Map<string, MockFileEntry>();

jest.mock('expo-file-system', () => {
  const getStore = (): Map<string, MockFileEntry> =>
    (globalThis as unknown as MockGlobal).__mockFileStore || new Map();
  const docDir = 'file:///var/mobile/Containers/Data/Application/1234-UUID/Documents/';

  class MockDirectory {
    uri: string;
    constructor(...parts: (string | { uri: string } | undefined | null)[]) {
      const joined = parts
        .filter((p): p is string | { uri: string } => p != null)
        .map((p) => (typeof p === 'object' && p?.uri ? p.uri : String(p)))
        .join('/')
        .replace(/\/+/g, '/')
        .replace('file:/', 'file:///');
      this.uri = joined.endsWith('/') ? joined : `${joined}/`;
    }
    create() {
      getStore().set(this.uri, { exists: true });
    }
  }

  class MockFile {
    uri: string;
    constructor(...parts: (string | { uri: string } | undefined | null)[]) {
      const joined = parts
        .filter((p): p is string | { uri: string } => p != null)
        .map((p) => (typeof p === 'object' && p?.uri ? p.uri : String(p)))
        .join('/')
        .replace(/\/+/g, '/')
        .replace('file:/', 'file:///');
      this.uri = joined;
    }
    get exists() {
      return getStore().get(this.uri)?.exists ?? false;
    }
    copy(target: MockFile) {
      const src = getStore().get(this.uri);
      getStore().set(target.uri, { exists: true, content: src?.content ?? 'mock-bytes' });
    }
    write(content: string) {
      getStore().set(this.uri, { exists: true, content });
    }
    delete() {
      getStore().delete(this.uri);
    }
  }

  return {
    Paths: {
      document: { uri: docDir },
    },
    Directory: MockDirectory,
    File: MockFile,
  };
});

describe('Profile Image Persistence & Account Isolation (Beta Blocker #1)', () => {
  beforeEach(() => {
    g.__mockFileStore.clear();
    jest.clearAllMocks();
  });

  describe('Native Platform (iOS & Android)', () => {
    it('copies temporary picker cache URI to persistent documentDirectory', async () => {
      const tempPickerUri = 'file:///var/mobile/Containers/Data/Application/1234-UUID/tmp/ImagePicker/test.jpg';
      g.__mockFileStore.set(tempPickerUri, { exists: true, content: 'image-binary' });

      const relativeUri = await persistAvatar({
        sourceUri: tempPickerUri,
        partition: 'legacy',
      });

      expect(relativeUri).toBe('avatars/avatar_legacy.jpg');

      // Verify that resolveAvatarUri yields the full documentDirectory path
      const resolved = resolveAvatarUri(relativeUri);
      expect(resolved).toBe(`${TEST_DOC_DIR}avatars/avatar_legacy.jpg`);
    });

    it('writes base64 data to persistent storage when base64 is provided', async () => {
      const relativeUri = await persistAvatar({
        sourceUri: 'file:///tmp/something.jpg',
        base64: 'base64-encoded-image-data',
        partition: 'account:user-1',
      });

      expect(relativeUri).toBe('avatars/avatar_account_user-1.jpg');
      const targetUri = `${TEST_DOC_DIR}avatars/avatar_account_user-1.jpg`;
      expect(g.__mockFileStore.get(targetUri)?.content).toBe('base64-encoded-image-data');
    });

    it('resolves sandbox-relative avatar paths correctly across iOS container UUID rotations', () => {
      // Suppose app was updated and documentDirectory changed to a new UUID
      const storedRelativeUri = 'avatars/avatar_legacy.jpg';
      const resolved = resolveAvatarUri(storedRelativeUri);

      expect(resolved).toBe(`${TEST_DOC_DIR}avatars/avatar_legacy.jpg`);
    });

    it('repairs legacy absolute file URIs with stale iOS sandbox UUIDs', () => {
      const oldAbsoluteUri = 'file:///var/mobile/Containers/Data/Application/OLD-UUID-9999/Documents/avatars/avatar_legacy.jpg';
      const resolved = resolveAvatarUri(oldAbsoluteUri);

      // Successfully re-anchored to the active documentDirectory
      expect(resolved).toBe(`${TEST_DOC_DIR}avatars/avatar_legacy.jpg`);
    });

    it('safely handles missing or empty avatar URI without crashing', () => {
      expect(resolveAvatarUri(undefined)).toBeUndefined();
      expect(resolveAvatarUri(null)).toBeUndefined();
      expect(resolveAvatarUri('')).toBeUndefined();
    });

    it('isolates avatars between different accounts', async () => {
      // User A
      const uriA = await persistAvatar({
        sourceUri: 'file:///tmp/a.jpg',
        base64: 'user-a-pic',
        partition: 'account:user-a',
      });

      // User B
      const uriB = await persistAvatar({
        sourceUri: 'file:///tmp/b.jpg',
        base64: 'user-b-pic',
        partition: 'account:user-b',
      });

      expect(uriA).toBe('avatars/avatar_account_user-a.jpg');
      expect(uriB).toBe('avatars/avatar_account_user-b.jpg');
      expect(uriA).not.toEqual(uriB);

      // Deleting User A's avatar does not affect User B
      const fileAUri = `${TEST_DOC_DIR}avatars/avatar_account_user-a.jpg`;
      const fileBUri = `${TEST_DOC_DIR}avatars/avatar_account_user-b.jpg`;
      expect(g.__mockFileStore.has(fileAUri)).toBe(true);
      expect(g.__mockFileStore.has(fileBUri)).toBe(true);

      await deleteAvatarForPartition('account:user-a');
      expect(g.__mockFileStore.has(fileAUri)).toBe(false);
      expect(g.__mockFileStore.has(fileBUri)).toBe(true);
    });

    it('migrates legacy temporary URIs if the source file is still readable', async () => {
      const legacyTempUri = 'file:///tmp/old-picker-photo.jpg';
      g.__mockFileStore.set(legacyTempUri, { exists: true, content: 'legacy-data' });

      const migrated = await migrateLegacyAvatar(legacyTempUri, 'legacy');
      expect(migrated).toBe('avatars/avatar_legacy.jpg');
    });

    it('clears legacy temporary URI to undefined if source file was evicted by OS', async () => {
      const evictedTempUri = 'file:///tmp/evicted-photo.jpg';
      // File does not exist in store

      const migrated = await migrateLegacyAvatar(evictedTempUri, 'legacy');
      expect(migrated).toBeUndefined(); // Safe fallback to initials avatar
    });
  });

  describe('Web / Safari PWA Platform', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      (Platform as { OS: string }).OS = 'web';
    });

    afterEach(() => {
      (Platform as { OS: string }).OS = originalPlatform;
    });

    it('returns persistent data: URI directly when base64 is present on web', async () => {
      const uri = await persistAvatar({
        sourceUri: 'blob:http://localhost:8081/123-abc',
        base64: 'web-base64-string',
        partition: 'legacy',
      });

      expect(uri).toBe('data:image/jpeg;base64,web-base64-string');
      // resolveAvatarUri returns data URIs unchanged
      expect(resolveAvatarUri(uri)).toBe('data:image/jpeg;base64,web-base64-string');
    });

    it('preserves existing data: URI on web', async () => {
      const existingDataUri = 'data:image/png;base64,existing-data';
      const uri = await persistAvatar({
        sourceUri: existingDataUri,
        partition: 'legacy',
      });

      expect(uri).toBe(existingDataUri);
      expect(resolveAvatarUri(uri)).toBe(existingDataUri);
    });
  });
});
