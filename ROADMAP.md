# Roadmap

- [x] Referenz inventarisiert, Audit und Ausgangsnachweise dokumentiert.
- [x] Workspace/Branch eingerichtet; ursprüngliche 136 Tests bestanden.
- [x] Phase 1: Startup/Recovery, Queue-Rennen/stilles Verwerfen, Client-Providerkey-Pfad und Streak korrigiert.
- [x] Phase 2a: EAS-Profile, getrennte Varianten, Dev-Client, Expo-Patches und Startkommando vorbereitet.
- [ ] Phase 2b: EAS-Projekt verknüpfen und echte iPhone-/Android-Gerätebuilds abnehmen. Apple-Mitgliedschaft fehlt.
- [x] Phase 3a: Native SQLite-Persistenz, Legacy-Import, atomarer Workout-Abschluss, SQL-/UI-Rollback und Ladebarriere.
- [x] Phase 3b – Code/Hosttests: Session-/Übungs-/Satz-/Outbox-Zeilen, Schema-2-Migration, granulare SQL-Writes, partitionsbezogene Stores/Reset und serialisierter Accountwechsel mit Schutz vor verspäteten Antworten.
- [ ] Phase 3c – Abnahme: reale Altbestände, Crash-/Migrationsprüfung auf Geräten, große History messen, JS-Projektionen/Pagination verkleinern.
- [x] Phase 4a: Domain-Kopierlogik für vollständige Workout-/Satzdetails, unterstützte Template-Ziele, RIR/Pausen/Supersets, Bereichserhalt und Änderungserkennung je Übungsvorkommen; native Wiederherstellung geprüft.
- [x] Phase 4b.1: History aggregiert alle Übungsvorkommen, getrennte Gewichts-/e1RM-Rekorde, ein e1RM-Bonus pro Übung, gleiche Namensauflösung bei Custom Exercises und Übernahme früherer Satzwerte je Vorkommen.
- [ ] Phase 4b.2: Übungen/Templates auf granulare Repositories umstellen. Erweiterte Vorlagen für individuelle Sätze/Zeiten/Distanzen benötigen einen eigenen Datenvertrag. PR-Ereigniszähler und versionierte e1RM-Formel bleiben weitere Facharbeit.
- [ ] Phase 5: Programme/Body/Profil mit vollständigen Datenbefehlen und Import-/Exportvertrag.
- [ ] Phase 6: Benutzergrenzen mit realen Accounts/Geräten abnehmen; historische Eigentümerzuordnung und Gast-ID, sichere Tokenmigration und Auth-Deep-Links. Lokale Accountpartitionen und Generation-Schutz sind bereits implementiert.
- [ ] Phase 7: Postgres-RPC, Tombstones, Revision-Konflikte, Pagination, NULL-DTOs und reale RLS-Tests.
- [ ] Phase 8: Accessibility, Sprachen und gemessene Performance.
- [ ] Phase 9: authentifizierter Coach mit Limits und transparenter Datenfreigabe.
- [ ] Phase 10: Release-Gates, TestFlight und Android interne Tests.

Stabiler Entwicklungszwischenstand: Phase 1 + 2a + 3a + Code/Hosttests von 3b sowie Phase 4a und 4b.1; 211 Tests. Nächste lokale Kernarbeit: Phase 4b.2 (granulare Übungs-/Vorlagen-Repositories). Geräte-/Account-Gates bleiben offen. Kein Hermes-Export wird als nativer Gerätebuild ausgegeben.
