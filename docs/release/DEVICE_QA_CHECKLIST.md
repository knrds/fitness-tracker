# EVARO – Device QA Checklist (Native iOS & Android)

Diese Checkliste dient der systematischen manuellen und automatisierten Abnahme von EVARO auf realen Geräten (iPhone / Android) und Simulatoren/Emulatoren vor dem produktiven Release.

**Status-Werte:**
- `PASS`: Erfolgreich auf Zielplattform verifiziert
- `FAIL`: Fehler/Regression festgestellt (Blocker für Release)
- `NOT_TESTED`: Noch nicht auf echtem Gerät verifiziert (z.B. Build/Device-Gate offen)
- `NOT_APPLICABLE`: Auf dieser Plattform oder in diesem Modus nicht zutreffend

---

## 1. Installation & Start

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Fresh Install** | NOT_TESTED | NOT_TESTED | Saubere Neuinstallation via TestFlight / APK; DB-Init ohne Crash, Begrüßungs- / Auth-Screen erscheint |
| **Update bestehender Beta** | NOT_TESTED | NOT_TESTED | Update über bestehende `v0.1.0-beta.x`; SQLite-Schema migration greift, alte Workouts bleiben intakt |
| **App Kill / Restart** | NOT_TESTED | NOT_TESTED | App im Task-Manager beenden und neu starten; lokaler State lädt fehlerfrei und performant |

---

## 2. Authentifizierung (Auth)

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Gastmodus** | NOT_TESTED | NOT_TESTED | Klick auf "Als Gast fortfahren"; volle lokale Funktionalität ohne Server-Zwang |
| **Login** | NOT_TESTED | NOT_TESTED | E-Mail/Passwort Login; Token-Speicherung, Profil-Laden, Sync-Queue Initialisierung |
| **Logout** | NOT_TESTED | NOT_TESTED | Sitzung beenden; Session-Clear, lokaler Gast-Zustand, kein Rest-State von vorherigem User |
| **Register** | NOT_TESTED | NOT_TESTED | Registrierung mit E-Mail; Bestätigungs-Feedback, Weiterleitung zum Onboarding/Dashboard |

---

## 3. Workout Tracking (Kernflow)

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Workout starten** | NOT_TESTED | NOT_TESTED | Leeres Workout oder aus Template starten; aktiver Workout-Screen öffnet sich, Timer läuft |
| **Übung hinzufügen** | NOT_TESTED | NOT_TESTED | Übungsauswahl-Modal öffnet sich, Suche funktioniert schnell, Übung erscheint in Liste |
| **Satz hinzufügen** | NOT_TESTED | NOT_TESTED | Neuer Satz wird mit Vorbelegung (oder leer) angehängt |
| **Reps erfassen** | NOT_TESTED | NOT_TESTED | Numerische Tastatur, ganzzahlige Eingabe validiert |
| **Gewicht erfassen** | NOT_TESTED | NOT_TESTED | Dezimaltastatur (Punkt/Komma), kg/lbs Umrechnung konsistent |
| **RPE erfassen** | NOT_TESTED | NOT_TESTED | RPE-Wert 6–10 (inkl. halbe Stufen) wählbar |
| **RIR erfassen** | NOT_TESTED | NOT_TESTED | RIR-Wert 0–5 wählbar |
| **RPE/RIR deaktiviert** | NOT_TESTED | NOT_TESTED | In Einstellungen deaktiviert: Spalten und Set-Optionen werden komplett ausgeblendet |
| **Satz abhaken** | NOT_TESTED | NOT_TESTED | Checkmark tippen: Grüner Haken, Haptik-Feedback, Rest-Timer startet automatisch |
| **Satz löschen** | NOT_TESTED | NOT_TESTED | Satz entfernen via Button oder Menü; verbleibende Sätze nummerieren sich neu |
| **Swipe Delete** | NOT_TESTED | NOT_TESTED | Wischgeste auf Satzzeile nach links löscht Satz sauber |
| **Workout minimieren** | NOT_TESTED | NOT_TESTED | Minimieren-Button oder Swipe: Floating Workout Bar am unteren Bildschirmrand |
| **Workout wiederherstellen** | NOT_TESTED | NOT_TESTED | Tipp auf Floating Bar: Voller Workout-Screen restored mit aktuellem Zustand |
| **Workout beenden** | NOT_TESTED | NOT_TESTED | "Beenden": Bestätigungsdialog, Speichern in SQLite, Historie aktualisiert, Erfolgs-Screen |

---

## 4. Rest Timer

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Rest Timer Start** | NOT_TESTED | NOT_TESTED | Startet automatisch nach Satzabschluss oder manuell; Countdown läuft exakt |
| **Pause** | NOT_TESTED | NOT_TESTED | Pause-Button stoppt Countdown, Icon wechselt zu Play |
| **Reset** | NOT_TESTED | NOT_TESTED | Setzt Zeit auf Standard-Pausenzeit zurück |
| **Zeit ändern (+/- 15/30s)** | NOT_TESTED | NOT_TESTED | Buttons erhöhen/verringern verbleibende Zeit ohne Latenz |
| **Swipe Up (Expand)** | NOT_TESTED | NOT_TESTED | Aufwärtswischen maximiert Timer-Overlay |
| **Swipe Down (Collapse)** | NOT_TESTED | NOT_TESTED | Abwärtswischen minimiert Timer zu kompakter Leiste |
| **Sound** | NOT_TESTED | NOT_TESTED | Audio-Signal ertönt bei Ablauf (Lautstärkeeinstellungen beachten, kein Crash) |
| **Haptic** | NOT_TESTED | NOT_TESTED | Vibrationsmuster bei Timer-Ende spürbar |

---

## 5. Datenverwaltung (Data & Profile)

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **History** | NOT_TESTED | NOT_TESTED | Alle absolvierten Workouts chronologisch aufgelistet, Detailansicht öffnet sich |
| **Weight** | NOT_TESTED | NOT_TESTED | Gewichtseintrag hinzufügen/löschen; Chart rendert Kurve korrekt |
| **Body Fat** | NOT_TESTED | NOT_TESTED | KFA-Eintrag erfassen; Chart rendert, Erklärungsdialog funktional |
| **Measurements** | NOT_TESTED | NOT_TESTED | Umfangsmaße (Brust, Arm, etc.) erfassen und anzeigen |
| **Programme / Templates** | NOT_TESTED | NOT_TESTED | Neues Template erstellen, Übungen sortieren, Template speichern und starten |
| **Achievements** | NOT_TESTED | NOT_TESTED | Badges/Erfolge schalten sich bei Erreichen frei (z.B. erster Workout) |

---

## 6. Lifecycle & System-Events

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **App Background** | NOT_TESTED | NOT_TESTED | App in Hintergrund schicken während aktivem Workout; Timer zählt weiter |
| **App Foreground** | NOT_TESTED | NOT_TESTED | App wieder öffnen; Timer-Zustand korrekt berechnet, UI aktuell |
| **OS Kill (Process Death)** | NOT_TESTED | NOT_TESTED | System beendet App im Hintergrund wegen RAM; Neustart stellt aktives Workout wieder her |
| **Offline** | NOT_TESTED | NOT_TESTED | Flugmodus: Workout, History, Body-Tracking voll einsatzfähig; Queue speichert offline |
| **Online Reconnect** | NOT_TESTED | NOT_TESTED | Flugmodus aus: Sync-Worker verarbeitet Queue ohne Duplikate |

---

## 7. Accessibility & Display-Varianten

| Testfall | iOS (iPhone) | Android | Erwartetes Verhalten / Notizen |
|---|---|---|---|
| **Große Schrift (Dynamic Type)** | NOT_TESTED | NOT_TESTED | OS-Schriftgröße maximiert: Keine abgeschnittenen Buttons, kein Text-Overlap |
| **Reduced Motion** | NOT_TESTED | NOT_TESTED | OS-Einstellung "Bewegung reduzieren": Animationen deaktiviert/reduziert, kein Ruckeln |
| **Screenreader (VoiceOver / TalkBack)** | NOT_TESTED | NOT_TESTED | Wichtigste Buttons und Satz-Zeilen haben saubere Accessibility-Labels |
| **Kleine Displays (z.B. SE / Mini)** | NOT_TESTED | NOT_TESTED | Keine Layout-Brüche, Scrolling überall sauber möglich |
| **Dark Mode / Oled Black** | NOT_TESTED | NOT_TESTED | Kontraste sauber, keine unlesbaren grauen Texte auf dunklem Grund |

---

## 8. Abnahme-Dokumentation

- **Testgerät iOS:** `_____________________` (iOS Version: `______`)
- **Testgerät Android:** `_____________________` (Android Version: `______`)
- **Tester / Agent:** `_____________________`
- **Datum:** `_____________________`
- **Gesamtfreigabe:** `[ ] PASS  [ ] CONDITIONAL  [ ] BLOCKED`
