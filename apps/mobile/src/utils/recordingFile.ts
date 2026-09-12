import { File } from 'expo-file-system';
export async function readRecording(uri: string): Promise<{ data: string; format: string }> {
  const file = new File(uri);
  if (file.size > 6000000) throw Error('Die Aufnahme ist zu groß. Bitte kürzer aufnehmen.');
  return { data: await file.base64(), format: 'm4a' };
}
export function releaseRecording(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* Temporary recording may already have been removed by the OS. */
  }
}
