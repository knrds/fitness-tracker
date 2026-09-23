import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { AppState, Platform } from 'react-native';
import { getStorageScope, isScopeCurrent } from '../data/storageScope';
import { streamCoachResponse } from '../utils/coachApi';
import { readRecording, releaseRecording } from '../utils/recordingFile';
import { hasValidAiConsent, CURRENT_AI_CONSENT_VERSION } from '@fitness-tracker/domain';
import { useProfileStore } from '../stores/profileStore';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: SpeechRecognitionResultItem }; length: number };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function useCoachRecorder(onText: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<Audio.Recording | null>(null);
  const epoch = useRef(0);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onText);
  callback.current = onText;
  const speechRef = useRef<{
    recognition: SpeechRecognitionInstance | null;
    transcript: string;
  }>({ recognition: null, transcript: '' });

  const cancel = useCallback(() => {
    epoch.current++;
    if (timer.current) clearTimeout(timer.current);
    if (speechRef.current.recognition) {
      try {
        speechRef.current.recognition.abort();
      } catch {
        // Ignore speech abort error
      }
      speechRef.current.recognition = null;
    }
    speechRef.current.transcript = '';
    const current = ref.current;
    ref.current = null;
    if (current)
      void current
        .stopAndUnloadAsync()
        .catch(() => undefined)
        .finally(() => {
          const uri = current.getURI();
          if (uri) releaseRecording(uri);
          void Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
        });
    locked.current = false;
    setRecording(false);
    setBusy(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state !== 'active') cancel();
      });
      return () => {
        subscription.remove();
        cancel();
      };
    }, [cancel]),
  );
  const stop = async () => {
    const current = ref.current;
    if (!current || locked.current) return;
    locked.current = true;
    ref.current = null;
    if (timer.current) clearTimeout(timer.current);
    const generation = epoch.current;
    const scope = getStorageScope();
    setRecording(false);

    if (speechRef.current.recognition) {
      try {
        speechRef.current.recognition.stop();
      } catch {
        // Ignore speech stop error
      }
      speechRef.current.recognition = null;
    }
    const localTranscript = speechRef.current.transcript.trim();
    speechRef.current.transcript = '';

    if (localTranscript) {
      if (generation === epoch.current && isScopeCurrent(scope)) {
        callback.current(localTranscript);
        locked.current = false;
        setBusy(false);
        void current
          .stopAndUnloadAsync()
          .catch(() => undefined)
          .finally(() => {
            const uri = current.getURI();
            if (uri) releaseRecording(uri);
            void Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
          });
        return;
      }
    }

    setBusy(true);
    let uri: string | null = null;
    try {
      await current.stopAndUnloadAsync();
      uri = current.getURI();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (!uri) throw Error('Keine Aufnahme verfügbar.');
      const audio = await readRecording(uri);
      if (generation !== epoch.current || !isScopeCurrent(scope)) return;
      const aiConsent = useProfileStore.getState().profile.aiConsent;
      if (!hasValidAiConsent(aiConsent, CURRENT_AI_CONSENT_VERSION)) {
        throw Error('AI_CONSENT_REQUIRED: Keine KI-Zustimmung vorhanden.');
      }
      for await (const text of streamCoachResponse(
        [
          {
            id: '00000000-0000-4000-8000-000000000001',
            role: 'user',
            content: 'Transcribe this voice memo.',
            createdAt: new Date(),
          },
        ],
        {
          profile: { displayName: '', preferredUnits: 'metric' },
          stats: { totalWorkouts: 0, currentStreak: 0 },
        },
        { audio },
      )) {
        if (generation === epoch.current && isScopeCurrent(scope)) callback.current(text);
      }
    } catch (e) {
      if (generation === epoch.current && isScopeCurrent(scope))
        setError(e instanceof Error ? e.message : 'Aufnahme fehlgeschlagen.');
    } finally {
      if (uri) releaseRecording(uri);
      if (generation === epoch.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  const start = async () => {
    if (locked.current || ref.current) return;
    locked.current = true;
    setError('');
    const generation = ++epoch.current;
    const scope = getStorageScope();
    try {
      const browser = globalThis as typeof globalThis & {
        MediaRecorder?: { isTypeSupported: (mime: string) => boolean };
        navigator?: { mediaDevices?: { getUserMedia?: unknown } };
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      if (
        Platform.OS === 'web' &&
        (!browser.MediaRecorder ||
          typeof browser.navigator?.mediaDevices?.getUserMedia !== 'function')
      )
        throw Error(
          'Dieser Browser unterstützt keine Sprachaufnahme. Bitte einen aktuellen Browser verwenden.',
        );
      const permission = await Audio.requestPermissionsAsync();
      if (generation !== epoch.current || !isScopeCurrent(scope)) return;
      if (!permission.granted)
        throw Error('Für Sprachmemos bitte den Mikrofonzugriff in den Einstellungen erlauben.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const options = Audio.RecordingOptionsPresets.HIGH_QUALITY;
      if (!options) throw Error('Die Aufnahme konnte nicht vorbereitet werden.');
      const webMime =
        Platform.OS === 'web'
          ? ['audio/webm', 'audio/mp4', 'audio/ogg'].find((mime) =>
              browser.MediaRecorder?.isTypeSupported(mime),
            )
          : undefined;
      const created = await Audio.Recording.createAsync(
        webMime ? { ...options, web: { ...options.web, mimeType: webMime } } : options,
      );
      if (generation !== epoch.current || !isScopeCurrent(scope)) {
        await created.recording.stopAndUnloadAsync();
        const uri = created.recording.getURI();
        if (uri) releaseRecording(uri);
        return;
      }
      ref.current = created.recording;
      setRecording(true);

      // Web Speech recognition parallel activation for instantaneous dictation
      if (Platform.OS === 'web') {
        const SpeechClass = browser.SpeechRecognition || browser.webkitSpeechRecognition;
        if (SpeechClass) {
          try {
            const rec = new SpeechClass();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'de-DE';
            speechRef.current.transcript = '';
            rec.onresult = (event: {
              results: { [key: number]: { [key: number]: { transcript: string } }; length: number };
            }) => {
              let full = '';
              for (let i = 0; i < event.results.length; i++) {
                const item = event.results[i]?.[0];
                if (item?.transcript) full += item.transcript + ' ';
              }
              speechRef.current.transcript = full.trim();
            };
            rec.onerror = () => undefined;
            rec.start();
            speechRef.current.recognition = rec;
          } catch {
            // Ignore speech recognition error, audio stream is recording in parallel
          }
        }
      }

      timer.current = setTimeout(() => void stop(), 60000);
    } catch (e) {
      if (generation === epoch.current)
        setError(e instanceof Error ? e.message : 'Mikrofon nicht verfügbar.');
    } finally {
      if (generation === epoch.current) locked.current = false;
    }
  };
  return { recording, busy, error, toggle: () => void (recording ? stop() : start()), cancel };
}
