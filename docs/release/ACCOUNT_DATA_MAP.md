# EVARO Account Data Map

Dieses Dokument dient als verbindliche technische Bestandsaufnahme aller im Repository existierenden lokalen und serverseitigen Datenspeicher von EVARO. Es definiert die Anforderungen für eine vollständige Account-Löschung (Apple App Store Guideline 5.1.1(v), Google Play Data Safety, DSGVO Art. 17) sowie für den Datenexport (DSGVO Art. 20 Datenübertragbarkeit).

---

## 1. Datenarten und Speicherorte

| Datenart | Lokal | Cloud | Speicherort / Tabelle | User-owned | Delete benötigt | Export benötigt | Evidence |
|---|---|---|---|---|---|---|---|
| **Auth User & Session** | Ja (MMKV/AsyncStorage) | Ja | Supabase `auth.users`, MMKV `supabase-auth-storage` | Ja | Ja (Löschung Auth-User + Token purge) | Ja (Email, Metadata) | `apps/mobile/src/utils/supabase.ts`, `docs/schema.sql:67` |
| **Benutzerprofil (Stammdaten)** | Ja (SQLite) | Ja | SQLite `state_documents` (`profile-storage`), Cloud `public.users` | Ja | Ja (Row Delete + Local reset) | Ja (Stammdaten, Einheiten, 1RMs, Ziele) | `apps/mobile/src/stores/profileStore.ts:149`, `docs/schema.sql:66` |
| **Profilbild / Avatar** | Ja (FileSystem) | Ja | Local FileSystem (`profileImageUri`), Supabase Storage Bucket `avatars` | Ja | Ja (Lokale Datei unlisten + Storage Object purge) | Ja (Download-URL / Bilddatei) | `profileStore.ts:144`, `docs/schema.sql:70` |
| **Workout Sessions (Historie)** | Ja (SQLite) | Ja | SQLite `workout_sessions`, `state_documents` (`history-storage`), Cloud `public.workout_sessions` | Ja | Ja (Cascade von `users.id` / SQLite Partition Wipe) | Ja (Kompletter Session-Verlauf inkl. Metadaten) | `documentDatabase.ts:69`, `docs/schema.sql:181`, `historyStore.ts` |
| **Session Exercises** | Ja (SQLite) | Ja | SQLite `session_exercises`, Cloud `public.session_exercises` | Ja | Ja (Cascade von `workout_sessions.id`) | Ja (Übungszuordnungen, Reihenfolge, Notizen) | `documentDatabase.ts:70`, `docs/schema.sql:202` |
| **Exercise Sets** | Ja (SQLite) | Ja | SQLite `exercise_sets`, Cloud `public.exercise_sets` | Ja | Ja (Cascade von `session_exercises.id`) | Ja (Sätze, Gewichte, Wdh, RPE, RIR, Dauer) | `documentDatabase.ts:71`, `docs/schema.sql:214` |
| **Aktives Workout (Draft/State)** | Ja (SQLite) | Nein (Client-only) | SQLite `state_documents` (`workout-storage`), SQLite `workout_sessions` (`collection='active'`) | Ja | Ja (Reset via `resetWorkout()`) | Ja (sofern aktiver Entwurf vorhanden) | `documentDatabase.ts:31`, `docs/schema.sql:272`, `workoutStore.ts` |
| **Workout Templates (Vorlagen)** | Ja (SQLite) | Ja | SQLite `state_documents` (`program-storage`), Cloud `public.workout_templates` | Ja | Ja (Cascade von `users.id` / Reset default) | Ja (User-Templates) | `programStore.ts`, `docs/schema.sql:112` |
| **Template Exercises** | Ja (SQLite) | Ja | SQLite JSON in `program-storage`, Cloud `public.template_exercises` | Ja | Ja (Cascade von `workout_templates.id`) | Ja (Zielvorgaben der Templates) | `docs/schema.sql:125` |
| **Trainingsprogramme** | Ja (SQLite) | Ja | SQLite `state_documents` (`program-storage`), Cloud `public.programs` | Ja | Ja (Cascade von `users.id` / Reset default) | Ja (Eigene & abonnierte Programme) | `programStore.ts`, `docs/schema.sql:148` |
| **Program Workouts** | Ja (SQLite) | Ja | SQLite JSON in `program-storage`, Cloud `public.program_workouts` | Ja | Ja (Cascade von `programs.id`) | Ja (Wochen- & Tageszuordnungen) | `docs/schema.sql:165` |
| **Eigene Übungen (Custom)** | Ja (SQLite) | Ja | SQLite `state_documents` (`exercise-storage`), Cloud `public.exercises` (`is_custom=true`) | Ja | Ja (`owner_id = user_id` löschen) | Ja (Name, Muskeln, Equipment, Pattern) | `exerciseStore.ts`, `docs/schema.sql:85` |
| **Persönliche Rekorde (PRs)** | Ja (SQLite) | Ja | SQLite berechnet in `history-storage`, Cloud `public.personal_records` | Ja | Ja (Cascade von `users.id`) | Ja (PR-Typ, Wert, Datum, Set-Referenz) | `docs/schema.sql:237`, `packages/domain/src/workout/logic.ts` |
| **Körpermaße & Gewicht** | Ja (SQLite) | Ja | SQLite `state_documents` (`body-metric-storage`), Cloud `public.body_metrics` | Ja | Ja (Cascade von `users.id` / Local Wipe) | Ja (Gewicht, KFA, Maße mit Zeitstempeln) | `bodyMetricStore.ts`, `docs/schema.sql:257` |
| **Hydration (Wasserzähler)** | Ja (SQLite) | Nein (aktuell lokal) | SQLite `state_documents` (`hydration-storage`) | Ja | Ja (Local Store Reset) | Ja (Tagesziel, getrunkene Menge, Datum) | `hydrationStore.ts:38` |
| **Koffein-Tracking** | Ja (SQLite) | Nein (aktuell lokal) | SQLite `state_documents` (`caffeine-storage`) | Ja | Ja (Local Store Reset) | Ja (Letzte & aktuelle Dosen in mg) | `caffeineStore.ts:16` |
| **Achievements & Level/XP** | Ja (SQLite) | Nein (aktuell lokal) | SQLite `state_documents` (`achievement-storage`) | Ja | Ja (Reset via `resetAchievements()`) | Ja (XP, Rank/Level, Unlocked IDs, Counts) | `achievementStore.ts:33` |
| **AI Coach Chatverlauf** | Ja (SQLite) | Nein (Client-only) | SQLite `state_documents` (`volt-coach-store`) | Ja | Ja (Local Purge `messages: []`) | Ja (Konversationen, Rollen, Zeitstempel) | `coachStore.ts:280`, `saveCoachPlan.test.ts:94` |
| **Sync Queue & Outbox** | Ja (SQLite) | Nein (lokale Queue) | SQLite `state_documents` (`volt-sync-store`), SQLite `sync_operations` | Ja | Ja (Clear via `clearQueue()`) | Nein (Interne Übertragungswarteschlange) | `syncStore.ts:1016`, `documentDatabase.ts:72` |
| **Normalisierungs-Backups** | Ja (SQLite) | Nein | SQLite `normalization_backups`, `legacy_imports` | Ja | Ja (Purge via `clearStorageBackups()`) | Nein (Technisches Zwischenformat) | `documentDatabase.ts:68`, `storage.ts:12` |
| **Audio-Aufnahmen (Coach)** | Ja (Temp File) | Nein (Vercel Relay) | Local Temp File (`readRecording`), ungespeichert nach Base64 | Flüchtig | Ja (Wird nach Upload via `releaseRecording()` gelöscht) | Nein (Nur flüchtige Spracheingabe) | `useCoachRecorder.ts:7`, `recordingFile.ts:7` |

---

## 2. Account Deletion Dependencies

### 2.1 Cloud Deletion Flow (Supabase)
1. **User Deletion Trigger / Admin API**:
   - Ein regulärer Client kann sich via `supabase.auth.admin.deleteUser(userId)` nicht selbst direkt löschen, da `admin` den Service-Role-Key erfordert.
   - **Lösung zwingend erforderlich:** Entweder ein Postgres RPC mit `SECURITY DEFINER` (`delete_current_user()`), der `auth.users` für `auth.uid()` löscht, oder eine Edge Function / Serverless Endpoint mit Service Role.
2. **Foreign Key Cascade Reihenfolge**:
   - `auth.users` -> `public.users` hat `ON DELETE CASCADE`.
   - `public.users` kaskadiert auf `workout_sessions`, `workout_templates`, `programs`, `personal_records`, `body_metrics`, und `exercises` (`is_custom=true`).
   - **Vorsicht bei `template_exercises`:** `template_exercises.exercise_id` referenziert `exercises(id)` mit `ON DELETE RESTRICT`! Wenn ein Benutzer eine eigene Custom Exercise erstellt und in einem Template verwendet hat, blockiert der FK-Constraint die Kaskadierung, falls `exercises` vor `workout_templates` / `template_exercises` gelöscht werden soll.
   - **Empfehlung für Astra:** Entweder `ON DELETE CASCADE` auf `template_exercises.exercise_id` setzen oder sicherstellen, dass `workout_templates` vor benutzerdefinierten `exercises` gelöscht werden.
3. **Storage Bucket Assets**:
   - Benutzer-Avatare in Supabase Storage (`avatars/<userId>/...`) werden nicht durch Postgres-Kaskaden gelöscht. Vor oder bei Account-Löschung muss der Storage-Ordner des Nutzers über die Storage-API bereinigt werden.

### 2.2 Local Device Deletion Flow
1. **Store Reset**:
   - `clearAllData()` in `apps/mobile/src/stores/profileStore.ts` setzt alle lokalen Zustand-Stores zurück.
2. **SQLite Partition Wipe**:
   - `clearStorageBackups()` löscht Backups und Partitionen.
   - Bei Benutzerwechsel / Account-Löschung muss die partitionierte SQLite-Datenbank (`training.sqlite`) für die betreffende Benutzer-ID vollständig bereinigt werden (`DELETE FROM state_documents WHERE partition = ?;`).
3. **Auth Session Wipe**:
   - `supabase.auth.signOut()` aufrufen.
   - `supabase-auth-storage` in MMKV/AsyncStorage leeren.
4. **Local File System**:
   - Falls ein lokales Profilbild existiert (`profileImageUri`), muss die Datei im App-Dokumentenverzeichnis gelöscht werden.

---

## 3. Export Dependencies

1. **Aktueller Stand (`profileStore.exportData()`)**:
   - Exportiert bereits JSON mit: Profil, Workouts, Templates, Custom Exercises, Favoriten, Body Metrics, Programmen, Notizen, Restzeiten, Achievements, Hydration, Caffeine, Coach Messages und aktuellem Workout-Draft.
2. **Fehlende / Ausstehende Felder für DSGVO-Vollständigkeit**:
   - Supabase Auth-Metadaten (Account-Erstellungsdatum, registrierte E-Mail-Adresse).
   - Profilbild-Export (entweder Base64-Encodierung oder Download-URL).
   - Format: JSON ist maschinenlesbar (DSGVO Art. 20 konform). Optional kann für Endanwender ein lesbarer CSV-Export von Workout-Logs ergänzt werden.

---

## 4. Unklare Bereiche

1. **Gast- / Offline-Nutzer**:
   - Wenn der Nutzer keinen Cloud-Account besitzt (`isAuthConfigured === false` oder nie eingeloggt), gibt es keine Cloud-Daten zu löschen. Hier reicht der bestehende lokale Reset (`clearAllData()`).
2. **Sync Queue Race Conditions**:
   - Wenn vor der Account-Löschung noch Operationen in `sync_operations` / `volt-sync-store` liegen, dürfen diese nicht mehr an Supabase gesendet werden. Die Outbox muss vor dem Cloud-Delete atomar verworfen werden.
3. **Store-Abonnements (RevenueCat)**:
   - Account-Löschung beendet kein aktives Apple/Google App Store-Abonnement. Nutzer müssen vor dem Löschen darauf hingewiesen werden, dass Abonnements separat im Apple/Google-Account gekündigt werden müssen.

---

## 5. ASTRA_REVIEW_REQUIRED

- [ ] **Supabase RPC / Endpoint**: Implementierung einer sicheren Funktion `delete_user_account()`, die serverseitig aufgerufen werden kann und alle Cloud-Tabellen + Auth-User atomar bereinigt.
- [ ] **FK-Constraint Prüfung**: Fix des potenziellen `ON DELETE RESTRICT`-Konflikts zwischen `template_exercises` und `exercises`.
- [ ] **Automatisierte Bereinigung von Storage-Buckets**: Bucket-Purge für Avatare.
- [ ] **Zweistufiger Bestätigungsdialog im UI**: Sicherheitsabfrage mit Bestätigungswort ("LÖSCHEN" / "DELETE") vor Durchführung der irreversiblen Löschung.
- [ ] **Abo-Kündigungshinweis**: Warnmeldung gemäß Apple-Richtlinien bezüglich weiterlaufender App-Store-Abos.
