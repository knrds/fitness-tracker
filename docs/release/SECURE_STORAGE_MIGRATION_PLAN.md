# EVARO — Secure Storage / Session Migration v1

Stand: 2026-09-19. Risiko: HIGH. Die Implementierung ist auf `astra/p0-release-core` in den nativen Supabase-Client integriert. Kein Merge, OTA-Rollout, EAS-Deployment oder Produktionszugriff in dieser Session. Physische Abnahme ist vor Auslieferung erforderlich.

## Alter und neuer Speicher

- Native Altquelle: unverschlüsseltes MMKV mit ID `supabase-auth-storage`; AsyncStorage als frühere Fallback-/Expo-Go-Quelle. MMKV hat bei zwei vorhandenen Werten Vorrang, entsprechend dem bisherigen Reader.
- Neues Ziel: bereits installierte `expo-secure-store`-Version 15.0.8. iOS Keychain mit `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, Android verschlüsselte SharedPreferences mit Keystore. Kein selbst implementiertes Kryptoverfahren, keine Biometriepflicht und keine neue Dependency.
- Native Auth nutzt den expliziten bisherigen Supabase-Key `sb-<project-ref>-auth-token` und den Supabase `processLock`. PKCE-/User-Nebenschlüssel laufen ebenfalls durch den Adapter, werden aber nicht als Session-JSON validiert.
- Web bleibt eine Entwicklungs-/Preview-Oberfläche mit bisheriger Speicherung; kein Ersatz für den nativen Release und keine Behauptung sicherer Web-Cookie-Authentifizierung.
- SQLite-/Workout-/Profil-/Queue-Daten und deren Partitionen werden nicht verändert.

## Versionierter Datenvertrag / Trigger

Jeder erste native Auth-Read prüft SecureStore. Nur bei nachweislich fehlendem SecureStore-Wert **und** fehlendem Marker wird die Altquelle gelesen. Ein nativer IO-Fehler ist niemals ein Cache-Miss.

Ein Sessionwert benötigt nicht-leere Access-/Refresh-Tokens, endlichen numerischen `expires_at` und eine User-UUID. Abgelaufene Sessions bleiben gültige Migrationskandidaten; Refresh/Servervalidierung bleibt Aufgabe von Supabase. Ungültige Daten werden unverändert erhalten und lösen den bestehenden Auth-Recovery-Pfad aus. Dies ist Strukturvalidierung, keine lokale JWT-Autorisierung.

1. Originalbytes lesen/validieren.
2. SecureStore schreiben und identische Bytes zurücklesen.
3. Nicht sensiblen Marker `<key>.evaro-v1 = migrated` schreiben/zurücklesen.
4. Beide nativen Altquellen entfernen. Scheitert Cleanup, wird der Fehler gemeldet; der nächste Read versucht erneut aufzuräumen.

Ein vorhandener gültiger SecureStore-Wert gewinnt immer. Fehlt er trotz `migrated`-Marker, wird der Zugang blockiert statt möglicherweise veraltete Credentials wiederzubeleben. Unbekannte Markerwerte blockieren den Reader. Reads/Writes/Migration/Logout werden pro Key und SecureStore-Instanz serialisiert; der native Singleton und Supabase-Prozesslock bilden die Laufzeitgrenze. Kein behaupteter Cross-Process-Lock für mehrere unabhängige JS-Runtimes.

## Fehlerverhalten

- Keine RAM- oder Klartext-Fallback-Writes auf nativen Plattformen.
- Native Fehlermeldungen werden durch feste technische Texte ersetzt; keine Tokens, Keys, Userdaten oder native Error-Payloads im neuen Loggerpfad.
- Fehlender/gesperrter Keychain, Schreib-/Readback-Fehler oder korrupte Altbytes werden sichtbar und retryfähig. Originaldaten werden nicht wegen Alter oder Fehlern gelöscht.
- Expo garantiert keine plattformübergreifende Maximalgröße. Historische iOS-Versionen können Werte über etwa 2048 Bytes ablehnen. Der Adapter speichert vollständige Sessions und behandelt Ablehnung ohne Löschen der Altquelle. Ein 20-kB-Failure-/Retry-Hosttest besteht; das ist **kein** Nachweis, dass diese Größe auf jedem Gerät gespeichert werden kann. Reale maximale Sessiongrößen/OAuth-Metadaten müssen vor Release geprüft werden. Bei Ablehnung: Release blockieren und eine separat geprüfte Größenstrategie ergänzen; kein stiller unsicherer Fallback.
- Auth-Aktionen fangen Storage-Rejections ab, beenden ihren Ladezustand und geben einen festen DE-/EN-Fehler zurück. Kein lokaler Datenreset auf Authfehler.

## Logout / Prozessabbruch

Vor dem Löschen wird `<key>.evaro-v1 = deleted` dauerhaft bestätigt. Anschließend werden SecureStore-Payload und beide Altquellen entfernt. Auch bei einer fehlgeschlagenen Löschung wird die andere Quelle versucht; der Aufruf meldet unvollständiges Cleanup. Der nicht sensible Marker bleibt bestehen, damit alte Tokens nach Neustart/Teilfehler nicht zurückkehren. Ein expliziter neuer erfolgreicher Login ersetzt den Marker erst nach bestätigtem Session-Write.

Ein Abbruch nach SecureStore-Commit und vor Legacy-Delete lässt zwei Kopien zurück: der Reader bevorzugt die neue und setzt Cleanup fort. Ein Abbruch nach Logout-Marker kann Tokenreste hinterlassen: Logout erneut ausführen; der Marker verhindert deren Verwendung. Keine Garantie physischer Flash-Löschung.

## Rollback / Review-Punkt

**Vor Deployment:** Branch prüfen und Geräte-Gates abschließen; der Git-Stand allein migriert kein reales Gerät.

**Nach Deployment:** Forward-Fix oder Rollback-Binary, das diesen v1-Reader samt Markerinterpretation behält. Legacy-Migration kann in einem Folgepatch pausiert werden, während bereits migrierte Sessions weiterhin aus SecureStore gelesen werden. Kein Rückschreiben von Tokens in Klartext. Einfaches Revert auf die alte MMKV-only-Binary wäre kein sessionsicherer Rollback: migrierte Nutzer müssten sich erneut anmelden. Alte Binärversionen dürfen deshalb nicht als Zero-Logout-Rollback beworben werden.

Kein zeitgesteuertes Entfernen des Legacy-Readers. Sicherer Rückbau erst anhand realer Upgrade-/Recovery-Nachweise. iOS-Keychain-Verhalten bei Neuinstallation und Android-Backup/Restore separat abnehmen. Neue Config enthält SecureStore-Backup-Ausschlüsse; ein natives Binary ist erforderlich, keine bloße Web-/OTA-Freigabe.

## Nachweise und offene Freigabe

Hosttests: korrupte Alt-/Secure-Daten, leere Stores, abgelaufene Sessions, unavailable native store, Readback-Mismatch, native Fehlerredaktion, große Payload-Ablehnung/Retry, Prozessabbruch vor Cleanup, unbekannte/fehlende Marker, Logout-Teilfehler/Retry, parallele Migration/Refresh/Logout, MMKV/AsyncStorage/Expo Go, echte installierte Supabase-JS-Session-Recovery, Integration der Storage-Optionen und Auth-Fehlerpfade.

PHYSICAL_DEVICE_REQUIRED: iPhone und Android Upgrade aus einer Beta mit derselben Bundle-ID, Logout/Accountwechsel, Sperre/Neustart/Prozess-Kill, Offline-Refresh, Speicherknappheit, große Session, Backup/Restore/Neuinstallation und Rollback mit kompatiblem Reader. Keine neue Bundle-ID ohne Nutzerentscheidung.

Quellen: [Expo SecureStore SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/) (Plattformspeicherung, Größenfehler, Backup), [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native) (Storage/Lock); außerdem installierter `@supabase/auth-js` 2.107.0 (`_isValidSession`, `_recoverAndRefresh`, Refresh-Commit-Guard).
