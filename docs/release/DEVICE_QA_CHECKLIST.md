# EVARO – Device QA Checklist (Native iOS & Android)

Diese Checkliste dient der systematischen manuellen Abnahme von EVARO auf realen physikalischen Geräten (iPhone / Android) und Simulatoren vor dem Store-Release.

> **Wichtiger Grundsatz (Section 24):**
> Automatisierte Jest-/Vitest-Mock-Tests sind **kein Ersatz** für echte physische Gerätetests.
> Punkte, die physische Hardware (Touchscreen, Lautsprecher, Taptic Engine, OS-Hintergrundverwaltung) erfordern, sind ehrlich als `PHYSICAL_DEVICE_TEST_REQUIRED` markiert.

---

## Legende der Status-Werte

- `PASS`: Erfolgreich auf Zielplattform physisch verifiziert
- `FAIL`: Fehler/Regression auf realem Gerät festgestellt (Release Blocker)
- `NOT_TESTED`: Noch nicht auf physischem Gerät getestet
- `BLOCKED`: Test blockiert (z.B. fehlende EAS-Credentials oder noch kein TestFlight/APK-Build vorhanden)
- `PHYSICAL_DEVICE_TEST_REQUIRED`: Erfordert physisches iOS-/Android-Gerät (kann nicht im Headless-Runner abgeschlossen werden)

---

## 1. Installation & App-Start

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Fresh Install** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Saubere Neuinstallation via TestFlight / APK; DB-Init ohne Crash, Begrüßungs- / Auth-Screen erscheint |
| **Update bestehender Beta** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Update über bestehende `v0.1.0-beta.x`; SQLite-Schema Migration greift, alte Workouts bleiben intakt |
| **App Launch (Cold Start)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Kaltstart unter 2.5 Sekunden bis zur interaktiven Oberfläche |
| **App Kill** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | App im Task-Manager (App Switcher) nach oben wischen / beenden |
| **Restart (Warm Start)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Erneuter Start nach App Kill; lokaler Zustand lädt fehlerfrei, kein Flackern |

---

## 2. Workout Flow & Tastaturinteraktion

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Workout starten** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Leeres Workout oder aus Template starten; Workout-Screen öffnet sich, Timer läuft |
| **Übung hinzufügen** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Modal öffnet sich flüssig; Suchleiste fokussiert, Filterung ohne Ruckeln |
| **Satz hinzufügen** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Neuer Satz wird mit Vorbelegung (oder leer) angehängt |
| **Reps erfassen (Keyboard)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Numerische Tastatur öffnet sich, Eingabe ohne Latenz, Dismiss via Tap außerhalb |
| **Gewicht erfassen (Keyboard)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Dezimaltastatur (Punkt vs. Komma je nach Locale), korrekte Parsing-Logik |
| **RPE erfassen** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Drei-Punkte-Menü öffnet sich, RPE 6–10 wählbar, korrekte Anzeige in Badge |
| **RIR erfassen** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Drei-Punkte-Menü öffnet sich, RIR 0–5 wählbar |
| **RPE/RIR deaktiviert** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | In Einstellungen deaktiviert: Drei-Punkte-Menü und Spalten werden sauber ausgeblendet |
| **Satz abhaken (Checkmark)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Checkmark antippen: grüner Haken, Haptik-Feedback, Rest-Timer startet automatisch |
| **Satz löschen (Menü)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Satz über Drei-Punkte-Menü löschen; Satz wird entfernt, Nummerierung aktualisiert |
| **Swipe Delete (Geste)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Wischgeste auf Satzzeile nach links löscht Satz flüssig mit rotem Indikator |
| **Workout minimieren (Animation)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Minimieren-Button oder Swipe: Floating Workout Bar slidet an unteren Rand |
| **Workout wiederherstellen** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Tap auf Floating Bar: Voller Workout-Screen restored mit aktuellem State |
| **Workout beenden** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | "Beenden" tippen: Bestätigungsdialog, Speichern in SQLite, Historie aktualisiert |

---

## 3. Haptik (Taptic Engine / Vibrator)

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Satz-Abschluss Feedback** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Leichtes/mittleres Haptik-Signal bei Tap auf grünen Haken |
| **Timer-Ablauf Feedback** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Deutliches 3-stufiges Vibrationsmuster bei Timer-Ende |
| **Button Feedback (Allgemein)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Subtiles Feedback bei wichtigen Aktions-Buttons |
| **Haptics Disabled State** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | In Einstellungen "Haptik" auf Aus: Keine Vibrationen bei Checkmarks/Buttons/Timer |

---

## 4. Audio (Timer Sound & Speaker)

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Timer Beep / Sound** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Audio-Signal ertönt zuverlässig bei 00:00 (kein Knacken, kein Lautsprecher-Crash) |
| **Audio-Einstellung Aus** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | In Einstellungen "Sound" auf Aus: Kein Ton bei Timer-Ablauf |
| **Stummschalter (Silent Switch / DND)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Hardware-Stummschalter aktiv: Ton verhält sich OS-konform (Vibration bleibt aktiv) |
| **Musik-Hintergrundwiedergabe** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Spotify/Apple Music läuft im Hintergrund: Timer-Sound duckt Musik sanft ab ohne Abbruch |

---

## 5. Lifecycle & OS-Events

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **App in den Hintergrund** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Home-Geste während aktivem Workout; Rest-Timer zählt im Hintergrund weiter |
| **App in den Vordergrund** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | App wieder öffnen: Timer-Differenz via Timestamp exakt nachgerechnet |
| **Bildschirmsperre (Screen Lock)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Power-Button drücken; nach Entsperren ist aktives Workout unberührt erhalten |
| **OS Memory Kill (Process Death)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | OS schließt App wegen RAM-Mangel; Resume-Guard fragt beim Neustart nach Wiederherstellung |
| **Offline-Betrieb (Flugmodus)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Workout, Historie, Messungen funktionieren ohne Verbindung; Queue puffert Aktionen |
| **Online Reconnect** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Flugmodus deaktivieren; Sync-Queue synchronisiert ohne Datenverlust oder Duplikate |

---

## 6. Accessibility & Display-Varianten

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Große Schrift (Dynamic Type)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | OS-Schriftgröße maximiert: Keine abgeschnittenen Buttons, kein unleserlicher Textüberlauf |
| **Reduced Motion** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | OS "Bewegung reduzieren" aktiv: Workout-Animationen und Sheet-Transitions reduziert/sofort |
| **VoiceOver / TalkBack** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Screenreader liest Satz-Inputs, Checkmarks, Timer-Buttons und Tabs sinnvoll vor |
| **Touch Targets (Min. 44x44 pt)** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Alle kritischen Taster (Checkmarks, Timer +/- Buttons, Delete) treffsicher bedienbar |
| **Kompakte Displays (z.B. iPhone SE)**| PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | 4.7" Display: Tastatur verdeckt nicht den aktiven Eingabesatz, ScrollView scrollt |
| **OLED Dark Mode & Kontraste** | PHYSICAL_DEVICE_TEST_REQUIRED | PHYSICAL_DEVICE_TEST_REQUIRED | Ausreichender Kontrast bei Sonneneinstrahlung im Gym, kein reines graues Mischen |

---

## 7. Abnahme-Protokoll

- **Testgerät iOS:** `_____________________` (iOS Version: `______`)
- **Testgerät Android:** `_____________________` (Android Version: `______`)
- **Tester / Agent:** `_____________________`
- **Datum:** `_____________________`
- **Gesamtfreigabe:** `[ ] PASS  [ ] CONDITIONAL  [ ] BLOCKED (Astra/User Action required)`
