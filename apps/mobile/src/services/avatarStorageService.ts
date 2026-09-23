import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import { getStorageScope } from '../data/storageScope';
import { logger } from '../utils/logger';

function sanitizePartition(partition: string): string {
  return partition.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Returns the permanent directory where avatars are stored on native devices.
 */
export function getAvatarDirectory(): string | null {
  if (Platform.OS === 'web') return null;
  try {
    const docUri = Paths.document.uri;
    return docUri.endsWith('/') ? `${docUri}avatars/` : `${docUri}/avatars/`;
  } catch {
    return null;
  }
}

/**
 * Resolves a stored avatar URI to a valid renderable URI.
 * Handles sandbox-relative paths, legacy absolute paths with mutated sandbox UUIDs, and data URIs.
 */
export function resolveAvatarUri(storedUri?: string | null): string | undefined {
  if (!storedUri || typeof storedUri !== 'string') return undefined;

  // Web base64 data URIs or external links are already fully resolved
  if (
    storedUri.startsWith('data:') ||
    storedUri.startsWith('http://') ||
    storedUri.startsWith('https://')
  ) {
    return storedUri;
  }

  // Web environment without native FileSystem
  if (Platform.OS === 'web') {
    return storedUri;
  }

  try {
    const docUri = Paths.document.uri;
    const normalizedDocUri = docUri.endsWith('/') ? docUri : `${docUri}/`;

    // Stored as relative path e.g. "avatars/avatar_guest.jpg" or "avatar_guest.jpg"
    if (storedUri.startsWith('avatars/')) {
      return `${normalizedDocUri}${storedUri}`;
    }
    if (storedUri.startsWith('avatar_')) {
      return `${normalizedDocUri}avatars/${storedUri}`;
    }

    // If it is an absolute file URI pointing to our avatars folder with a stale sandbox UUID (iOS container rotation)
    if (storedUri.startsWith('file://')) {
      const avatarIndex = storedUri.indexOf('/avatars/');
      if (avatarIndex !== -1) {
        const subpath = storedUri.slice(avatarIndex + 1); // "avatars/avatar_..."
        return `${normalizedDocUri}${subpath}`;
      }
    }
  } catch {
    return storedUri;
  }

  return storedUri;
}

/**
 * Reads a Web Blob URI and converts it into a persistent base64 Data URI.
 */
async function blobToDataUri(blobUri: string): Promise<string> {
  const response = await fetch(blobUri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URI'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export interface SaveAvatarOptions {
  sourceUri: string;
  base64?: string | null | undefined;
  partition?: string | undefined;
}

/**
 * Copies or encodes the picked image into a persistent, app-owned storage location.
 * Native: writes to Paths.document/avatars/<filename> and returns relative path.
 * Web: returns a persistent base64 Data URI (never an ephemeral blob: URL).
 */
export async function persistAvatar({
  sourceUri,
  base64,
  partition,
}: SaveAvatarOptions): Promise<string> {
  const activePartition = partition ?? getStorageScope().partition;
  const safePartition = sanitizePartition(activePartition);

  // Web Platform Strategy
  if (Platform.OS === 'web') {
    if (base64) {
      return `data:image/jpeg;base64,${base64}`;
    }
    if (sourceUri.startsWith('data:')) {
      return sourceUri;
    }
    if (sourceUri.startsWith('blob:')) {
      return await blobToDataUri(sourceUri);
    }
    return sourceUri;
  }

  // Native Platform Strategy (iOS & Android)
  const filename = `avatar_${safePartition}.jpg`;
  const relativeStoredUri = `avatars/${filename}`;

  try {
    const avatarsDir = new Directory(Paths.document, 'avatars');
    avatarsDir.create({ intermediates: true, idempotent: true });

    const targetFile = new File(avatarsDir, filename);

    if (base64) {
      targetFile.write(base64, { encoding: 'base64' });
    } else {
      const sourceFile = new File(sourceUri);
      sourceFile.copy(targetFile);
    }

    return relativeStoredUri;
  } catch (error) {
    logger.warn('[AvatarStorage] Failed to copy avatar to persistent location', error);
    if (base64) return `data:image/jpeg;base64,${base64}`;
    return sourceUri;
  }
}

/**
 * Inspects legacy stored URIs. If pointing to temporary cache paths that still exist,
 * migrates them into persistent app storage. If file is gone, returns undefined.
 */
export async function migrateLegacyAvatar(
  storedUri?: string | null,
  partition?: string,
): Promise<string | undefined> {
  if (!storedUri) return undefined;

  // Already migrated or self-contained
  if (
    storedUri.startsWith('avatars/') ||
    storedUri.startsWith('avatar_') ||
    storedUri.startsWith('data:') ||
    storedUri.startsWith('http://') ||
    storedUri.startsWith('https://')
  ) {
    return storedUri;
  }

  // Web check
  if (Platform.OS === 'web') {
    if (storedUri.startsWith('blob:')) return undefined;
    return storedUri;
  }

  // Native file path migration
  if (storedUri.startsWith('file://')) {
    try {
      const sourceFile = new File(storedUri);
      if (sourceFile.exists) {
        return await persistAvatar({ sourceUri: storedUri, partition });
      }
    } catch {
      // Ignore read errors
    }
    return undefined;
  }

  return storedUri;
}

/**
 * Removes the persistent avatar file associated with a given partition.
 */
export async function deleteAvatarForPartition(partition: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const filename = `avatar_${sanitizePartition(partition)}.jpg`;
    const file = new File(Paths.document, 'avatars', filename);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    logger.warn('[AvatarStorage] Could not delete avatar for partition ' + partition, error);
  }
}
