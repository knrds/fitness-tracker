# EVARO – Secure Storage Migration Plan (Auth & Token Persistenz)

Dieses Dokument analysiert die aktuelle Authentifizierungs- und Token-Speicherung in EVARO und beschreibt die geplante schrittweise Migration von unverschlüsseltem MMKV/AsyncStorage zu hardware-unterstütztem `expo-secure-store` (iOS Keychain / Android Keystore).

---

## 1. Current Implementation

### Storage-Mechanismus
- Supabase Auth nutzt in `apps/mobile/src/utils/supabase.ts` einen eigenen Storage-Adapter:
  ```ts
  const createSupabaseStorage = (): MMKV | null => {
    if (isServer || isExpoGo) return null;
    try {
      return new MMKV({ id: 'supabase-auth-storage' });
    } catch (error) {
      logger.warn('[Supabase] MMKV auth storage unavailable. Falling back to AsyncStorage.', error);
      return null;
    }
  };
  ```
- **Fallback-Kette:** MMKV (`supabase-auth-storage`) -> `AsyncStorage` (wenn MMKV fehlschlägt oder in Expo Go) -> `window.localStorage` (im Web).

### Session-Verhalten
- `supabase.auth.onAuthStateChange` synchronisiert die Session mit `useAuthStore`.
- Bei Login schreibt Supabase das vollständige JSON-Session-Objekt unter einem generierten Schlüssel (`sb-<project-ref>-auth-token`) in die Storage-Instanz.
- Beim Start ruft `useAuthStore.initialize()` `supabase.auth.getSession()` auf, wodurch der Token aus MMKV/AsyncStorage gelesen wird.
- Im Gastmodus (`!isSupabaseConfigured` oder ohne Login) wird keine Session persistiert; lokale Daten nutzen `LOCAL_USER_ID` in partitionierten MMKV-Stores.
- Bei Account-Wechsel oder Logout löscht Supabase den Eintrag via `storage.delete(key)` bzw. `removeItem(key)`.

---

## 2. Sensitive Values

Folgende Werte liegen aktuell unverschlüsselt im Dateisystem der App-Sandbox:
1. `access_token`: JWT für autorisierte API-Anfragen an Supabase (PostgREST, Edge Functions wie Coach Chat).
2. `refresh_token`: Langlebiges Token zur Ausstellung neuer Access-Tokens (Re-Authentication ohne Passwort).
3. `user.email`: Klartext-E-Mail des registrierten Nutzers.
4. `user.id`: Primärschlüssel (UUID) des Accounts.

### Sicherheitsrisiko
Auf gerooteten Android-Geräten oder gejailbreakten iPhones sowie bei unverschlüsselten Geräte-Backups (z.B. unverschlüsseltes iTunes/Finder Backup) kann die MMKV-Datei `supabase-auth-storage` ausgelesen werden. Angreifer könnten mit dem `refresh_token` dauerhaft Zugriff auf den Nutzeraccount erlangen.

---

## 3. Proposed Target Architecture

### Ziel: Hybrid Secure Storage
- **Tokens & Secrets:** Speicherung in `expo-secure-store`:
  - **iOS:** Keychain Services (Hardware-gesichert durch Secure Enclave, persistent über App-Updates).
  - **Android:** Android Keystore mit AES-GCM verschlüsselten `EncryptedSharedPreferences`.
  - **Web:** Sichere Session-Cookies oder flüchtiger Speicher (kein LocalStorage für Refresh-Tokens).
- **Zustands- & Cache-Daten:** Unkritische Daten (UI-Zustand, Workout-Cache) verbleiben für maximale Performance in MMKV.
- **Größenbeschränkung beachten:** `expo-secure-store` hat unter Android eine Größenbeschränkung von 2048 Bytes pro Eintrag. Ein kompletter Supabase-Session-Blob mit Nutzer-Metadaten kann diese Grenze in seltenen Fällen überschreiten. Daher:
  - *Option A:* Nur `refresh_token` und `access_token` in SecureStore auslagern; Profil-/User-Metadaten in MMKV.
  - *Option B:* Chunken großer Werte oder verschlüsselter MMKV-Store mit AES-Schlüssel im SecureStore (**Empfohlen**).

---

## 4. Existing Beta Migration Challenge

Bestehende Beta-Tester (Beta 1 bis 4) haben ihre aktive Session aktuell in MMKV `supabase-auth-storage` liegen.
- **Risiko bei hartem Cut:** Wenn beim App-Update direkt nur noch SecureStore gelesen wird, finden bestehende Nutzer keinen Token mehr vor und werden **zwangsabgemeldet** (`Session invalidated`).
- **Offline-Gefahr:** Ist der Nutzer nach dem Update offline und wird abgemeldet, verliert er vorübergehend Zugriff auf seine synchronisierten Daten, bis er wieder online ist und sich anmeldet.

---

## 5. Suggested Migration Sequence (Zero-Logout Strategy)

```
[App Start]
     │
     ▼
Prüfe SecureStore auf Session-Token
     │
     ├── Gefunden? ─────────────────────────► Session aus SecureStore laden (Zielzustand)
     │
     └── Nicht gefunden?
              │
              ▼
         Prüfe Legacy MMKV (`supabase-auth-storage`)
              │
              ├── Gefunden? ───────────────► 1. In SecureStore übertragen
              │                               2. Aus Legacy MMKV löschen
              │                               3. Session fortsetzen (Kein Zwangs-Logout!)
              │
              └── Nicht gefunden? ─────────► Nutzer ist Gast / nicht angemeldet
```

### Phasenplan:
1. **Phase 1 (Vorbereitung - jetzt durch Gemini erledigt):**
   - Spezifikation erstellen (`SECURE_STORAGE_MIGRATION_PLAN.md`).
   - Nicht-aktiven Adapter `secureStorageAdapter.ts` bereitstellen.
   - Keine produktive Aktivierung in `v0.1.0-beta.4`.
2. **Phase 2 (Astra Implementierung & Review):**
   - Fallback-Migrationsadapter aktivieren.
   - Dual-Read: Erst SecureStore lesen, bei Miss MMKV lesen und migrieren.
   - Löschung des alten MMKV-Eintrags erst nach erfolgreicher Bestätigung des Writes im SecureStore.
3. **Phase 3 (Cleanup in späteren Releases):**
   - Nach z.B. 60 Tagen den Legacy-MMKV-Read entfernen.

---

## 6. Rollback Strategy

Sollte es auf bestimmten Android-Geräten zu Problemen mit dem Android Keystore kommen (bekannter Bug auf älteren Geräten / Custom ROMs):
1. **Adapter-Fallback:** Wenn `SecureStore.setItemAsync` einen Keystore-Fehler wirft, fängt der Adapter den Fehler ab und fällt transparent auf verschlüsseltes MMKV zurück.
2. **Git Rollback:** Die Storage-Abstraktion ist in einer einzelnen Datei (`src/utils/supabase.ts`) gekapselt. Ein Rollback auf den vorherigen Stand erfordert lediglich die Rücknahme dieses einzelnen Commits.

---

## 7. Tests Required

Vor der produktiven Aktivierung durch Astra müssen folgende Tests bestanden werden:
1. **Fresh Install Test:** Anmeldung speichert direkt in SecureStore.
2. **Migration Test:** Vorhandener Token in MMKV wird beim ersten Start fehlerfrei in SecureStore übernommen; MMKV wird danach geleert; User bleibt angemeldet.
3. **Device Reboot / OS Kill:** Keychain/Keystore behält Token nach Kaltstart des Telefons.
4. **Android Payload Size Test:** Session-Objekt mit großen OAuth-Metadaten überschreitet nicht das 2048-Byte-Limit.
5. **Sign Out Test:** Token wird rückstandslos aus Keychain / Keystore entfernt.

---

## 8. Risks

| Risiko | Schwere | Mitigation |
|---|---|---|
| Android Keystore Unverfügbarkeit (z.B. nach Biometrie-Änderung oder Gerätesperre) | MITTEL | Try-Catch mit transparentem Fallback; keine unhandled Promise Rejections |
| Zwangsabmeldung von Beta-Nutzern | HOCH | Dual-Read Migration (Zero-Logout Strategy) |
| Performance-Einbuße bei jedem State-Lesen | NIEDRIG | SecureStore wird nur beim Start und Token-Refresh gelesen, nicht bei jedem Render |

---

## 9. Astra Decisions Required

1. **Verschlüsselungs-Architektur:**
   - *Entscheidung:* Soll ein hybrid verschlüsselter MMKV-Store verwendet werden (AES-Key im SecureStore, Nutzlast in MMKV), um Größenbeschränkungen auf Android vollständig zu umgehen?
2. **Web-Storage:**
   - *Entscheidung:* Soll im Web auf LocalStorage verzichtet und rein auf Memory-Storage gesetzt werden (erfordert Re-Login nach Tab-Schließen), oder bleibt LocalStorage für Web-Previews akzeptabel?
3. **Biometrie-Koppelung:**
   - *Entscheidung:* Soll das Auslesen des SecureStore an FaceID / Fingerabdruck gekoppelt werden (z.B. für EVARO Pro Einstellungen)?
