# Roadmap

- [x] Referenz inventarisiert, Audit und Ausgangsnachweise dokumentiert.
- [x] Workspace/Branch eingerichtet; ursprüngliche 136 Tests bestanden.
- [x] Phase 1: Startup/Recovery, Queue-Rennen und stilles Verwerfen, Client-Providerkey-Pfad und Streak-Fehler korrigiert.
- [x] Phase 2a: EAS-Profile, getrennte App-Varianten, Dev-Client, Expo-Patches und Startkommando vorbereitet.
- [ ] Phase 2b: EAS-Projekt verknüpfen und iPhone-/Android-Gerätebuild tatsächlich abnehmen. Apple-Mitgliedschaft fehlt.
- [x] Phase 3a: Native SQLite-Dokumentpersistenz, validierter Legacy-Import, atomarer Workout-Abschluss, SQL-/UI-Rollback, Daten-Ladesperre und Fehlerdialoge getestet.
- [ ] Phase 3b: Sessions/Sets/History/Outbox normalisieren, Benutzerpartition und granulare Writes; Crash-/Migrationsabnahme auf Geräten und Profiling großer History.
- [ ] Phase 4: Übungen/Templates auf granulare Repositories umstellen, vollständige Parameter beim Kopieren, History/PR-Begriffe konsistent machen.
- [ ] Phase 5: Programme/Body/Profil mit vollständigen Datenbefehlen und Import-/Exportvertrag.
- [ ] Phase 6: Account-Isolation, sichere Tokenmigration und Auth-Deep-Links, Nutzerwechsel A→B→Gast.
- [ ] Phase 7: Postgres-RPC, Tombstones, Revision-Konflikte, Pagination, NULL-DTOs und reale RLS-Tests.
- [ ] Phase 8: Accessibility, Sprachen und gemessene Performance.
- [ ] Phase 9: authentifizierter Coach mit Limits und transparenter Datenfreigabe.
- [ ] Phase 10: vollständige Release-Gates, TestFlight und Android interne Tests.

Aktueller stabiler Entwicklungszwischenstand: Phase 1 + 2a + 3a. Nächste unabhängige Kernarbeit: Phase 3b; Geräte-/Account-Gates bleiben offen und blockieren keine lokale Entwicklung. Keine native Abnahme aufgrund eines erfolgreichen JS-Exports behaupten.
