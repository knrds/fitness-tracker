export async function readRecording(uri: string): Promise<{ data: string; format: string }> {
  const blob = await fetch(uri).then((response) => response.blob());
  if (blob.size > 6000000) throw Error('Die Aufnahme ist zu groß. Bitte kürzer aufnehmen.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result.split(',')[1] ?? '')
        : reject(Error('Aufnahme konnte nicht gelesen werden.'));
    reader.onerror = () => reject(Error('Aufnahme konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
  return {
    data,
    format: blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm',
  };
}
export function releaseRecording(uri: string) {
  URL.revokeObjectURL(uri);
}
