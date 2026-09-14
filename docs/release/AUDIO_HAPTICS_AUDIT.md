# EVARO Audio & Haptics Technical Audit

Dieses Dokument analysiert die aktuelle Implementierung von Audio-, Timer- und Haptik-Signalen im gesamten Repository von EVARO. Es deckt bestehende Inkompatibilitäten auf nativen Geräten (iOS / Android) auf und bereitet Migrationspfade für den leitenden Agenten (Astra) vor.

---

## 1. Current Implementation

Aktuell existieren zwei getrennte Mechanismen für Audio und Haptik:

1. **Timer-Audio (`apps/mobile/src/utils/timerAudio.ts`)**:
   - Synthetisiert einen Zweiklang-Glockenton (A5 / 880 Hz -> D6 / 1174.66 Hz, angelehnt an das Signal der Apple Watch).
   - Implementierung basiert vollständig auf der **W3C Web Audio API** (`AudioContext` / `webkitAudioContext`, `OscillatorNode`, `GainNode`).
   - Funktion `triggerRestTimerAlarm()` kombiniert den Ton mit haptischem Feedback via `expo-haptics`.
2. **Coach Voice Recording (`apps/mobile/src/hooks/useCoachRecorder.ts`)**:
   - Verwendet `Audio.Recording` aus `expo-av@16.0.8` zur Sprachaufzeichnung von Prompts für den AI Coach.
   - Die temporäre Audioaufnahme wird als Base64 kodiert an Whisper übermittelt und danach via `releaseRecording()` gelöscht.
3. **Haptik-Signale (`expo-haptics@~15.0.8`)**:
   - Breiter Einsatz von `selectionAsync`, `impactAsync` (Light/Medium/Heavy) und `notificationAsync` (Success/Warning).

---

## 2. Web-Only APIs & Native Defizite

### 2.1 Web Audio API auf nativen Runtimes
In `apps/mobile/src/utils/timerAudio.ts:37` steht:
```ts
const g = globalThis as unknown as {
  AudioContext?: new () => BrowserAudioContext;
  webkitAudioContext?: new () => BrowserAudioContext;
};
const AudioCtx = g.AudioContext || g.webkitAudioContext;
if (!AudioCtx) return;
```
- **Fakt:** Weder die JavaScriptCore- noch die Hermes-Engine von React Native stellt eine globale `AudioContext`-Schnittstelle bereit.
- **Konsequenz auf nativen Geräten:** `AudioCtx` ist zur Laufzeit `undefined`. Die Funktion kehrt stillschweigend via `return` zurück.
- **Ergebnis:** Auf echten iOS- und Android-Geräten ertönt beim Ablauf des Pausentimers **kein Ton**, sondern ausschließlich die haptische Vibration.
- **Web-Vorschau:** Im Web-Browser funktioniert die Tonsynthese; auf mobilen Endgeräten existiert ein stiller Audio-Ausfall.

---

## 3. Native-Compatible Components Already Available

Im Projekt sind bereits folgende native Bibliotheken konfiguriert und einsatzbereit:

1. **`expo-haptics` (~15.0.8)**:
   - Funktioniert vollständig auf iOS (Taptic Engine) und Android (Vibrator Service).
2. **`expo-av` (^16.0.8)**:
   - In `apps/mobile/package.json` installiert.
   - Im Config Plugin von `apps/mobile/app.json:37` registriert (`microphonePermission`).
   - Bietet out-of-the-box die Klasse `Audio.Sound` zur nativen Audiowiedergabe von statischen Assets (`.mp3`, `.wav`, `.m4a`).
3. **Lokale Sound-Assets:**
   - **Befund:** Im gesamten Repository existiert aktuell **keine einzige statische Audiodatei** (`.mp3`, `.wav`, `.m4a`).

---

## 4. Call Sites Übersicht

| Feature / Screen | Datei | Typ | Verhalten |
|---|---|---|---|
| **Rest Timer Alarm** | `src/components/workout/RestTimer.tsx:57` | Audio + Haptik | Ruft `triggerRestTimerAlarm()` auf: Web-Audio-Chime + Notification Warning + Heavy Impact |
| **Satz abhaken (Checkmark)** | `src/components/workout/SessionExerciseCard.tsx:712` | Haptik | `Haptics.notificationAsync(Success)` + `Haptics.impactAsync(Light)` |
| **Satz löschen / Reorder** | `src/components/workout/SessionExerciseCard.tsx:1254` | Haptik | `Haptics.impactAsync(Medium)` |
| **Workout beenden** | `app/workout/session.tsx:121` | Haptik | `Haptics.notificationAsync(Success)` |
| **Workout starten (Quick/Template)** | `app/(tabs)/workouts.tsx:144` | Haptik | `Haptics.notificationAsync(Success)` |
| **Achievement Freischaltung** | `src/components/workout/AchievementCelebration.tsx:95` | Haptik | `Haptics.notificationAsync(Success)` |
| **BattlePass / Perks** | `src/components/BattlePassModal.tsx:111, 127` | Haptik | `Haptics.impactAsync(Light)` & `Haptics.selectionAsync()` |
| **Design- / Theme-Auswahl** | `src/components/AppearanceSettings.tsx:32, 57, 94` | Haptik | `selectionAsync()`, `notificationAsync(Warning/Success)` |
| **Historie aufklappen** | `app/(tabs)/history.tsx:1073` | Haptik | `Haptics.impactAsync(Light)` |
| **Reorder / Drag & Drop** | `src/hooks/useMeasuredReorder.ts:264`, `useFolderTemplateReorder.ts:182` | Haptik | `Haptics.selectionAsync()` |

---

## 5. User Settings Status

- **Status:** **Keine Einstellungsoptionen vorhanden.**
- Es existieren in `profileStore.ts` und im Einstellungs-UI (`profile.tsx`) weder Toggles für Töne (z. B. "Rest Timer Sound: An/Aus") noch für Haptik ("Haptisches Feedback: An/Aus").
- Für Athleten im Fitnessstudio mit Kopfhörern oder stummem Gerät ist eine differenzierte Konfigurierbarkeit im Profil essenziell.

---

## 6. Risiken auf nativen Geräten

1. **Stummer Schalter (iOS Ring/Silent Switch)**:
   - Standardmäßig spielt iOS Audio im Ambient-Modus nicht ab, wenn der Stummschalter aktiv ist.
   - Wenn ein Timer-Ton über `expo-av` abgespielt werden soll, muss `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })` explizit gesetzt werden, sonst bleibt der Ton auf iPhones im Lautlos-Modus stumm.
2. **Audio-Ducking / Hintergrundmusik**:
   - Trainierende hören während des Workouts typischerweise Musik (Spotify, Apple Music).
   - Ein Timer-Ton darf die Musikwiedergabe nicht abbrechen, sondern muss sie sanft absenken ("Ducking") oder darüber mischen (`interruptionModeIOS: InterruptionModeIOS.MixWithOthers`).
3. **Hintergrund-Timer & Sleep Mode**:
   - Wenn der Bildschirm während der Satzpause gesperrt wird, schläft der React Native Timer (`setInterval`/`setTimeout`) auf iOS/Android ein.
   - Ein nativer Ton kann im gesperrten Zustand nur über lokale Push Notifications (`expo-notifications`) mit Sound zuverlässig ausgelöst werden.

---

## 7. Candidate Migration Paths for Astra

### Option A: `expo-av` mit lokalem Audio-Asset (Empfohlen für V1)
- **Vorgehensweise:**
  1. Eine lizenzfreie, hochwertige Glockenklang-Audiodatei (z. B. `assets/sounds/timer-bell.mp3`, ca. 20–40 KB) zum Projekt hinzufügen.
  2. In `timerAudio.ts` via `Audio.Sound.createAsync(require('../../assets/sounds/timer-bell.mp3'))` abspielen.
  3. Audio-Modus initialisieren:
     ```ts
     await Audio.setAudioModeAsync({
       playsInSilentModeIOS: true,
       staysActiveInBackground: false,
       shouldDuckAndroid: true,
       playThroughEarpieceAndroid: false,
     });
     ```
  4. Web Audio API als Fallback für Web beibehalten (`Platform.OS === 'web'`).
- **Vorteile:** Keine neuen Dependencies (bereits in `package.json` und `app.json`), minimale Bundle-Größe, sofortige native Lauffähigkeit.

### Option B: Migration auf `expo-audio` (Expo SDK 52/54 Next-Gen API)
- **Vorgehensweise:**
  1. Installation von `expo-audio`.
  2. Umstellung der Audio-Player-Instanzen auf die moderne Hook-basierte API.
- **Nachteile für V1:** Erfordert Konfigurationsänderung in `app.json` und neuen nativen Dev-Build (EAS Prebuild), bietet für einen einfachen Timer-Glockenton keinen funktionalen Mehrwert gegenüber `expo-av`.

---

## 8. ASTRA_REVIEW_REQUIRED

- [ ] **Audiodatei bereitstellen:** Lizenzfreien MP3/WAV-Chime unter `apps/mobile/assets/sounds/` ablegen.
- [ ] **Audio-Modus konfigurieren:** Einmalige Initialisierung von `Audio.setAudioModeAsync` beim App-Start mit Ducking und Silent-Mode-Support für iOS.
- [ ] **User-Settings im Profil:** Toggles für "Timer-Ton (An/Aus)" und "Haptik (An/Aus)" in `profileStore.ts` und `profile.tsx` ergänzen.
- [ ] **Background-Alarm:** Prüfung, ob für gesperrte Bildschirme eine lokale Notification via `expo-notifications` mit Ton eingeplant werden soll.
