# Roadmap

- [x] Referenz inventarisiert, Stack/Domain/Stores/SQL/History untersucht.
- [x] Baseline: Typecheck, Lint, 136 Tests und Web/iOS/Android-JS-Export erfolgreich.
- [x] Auditbericht und Zielarchitektur festgelegt, Workspace/Branch vorbereitet.
- [ ] Phase 1: Recovery- und Queue-Datenverlust verhindern, Client-Secret-Pfad entfernen; Regressionen grün.
- [ ] Phase 2: EAS Development Build konfigurieren, natives iPhone/Android tatsächlich testen.
- [ ] Phase 3: SQLite-Workout-Vertikalschnitt mit atomarem Finalize und Legacy-Import.
- [ ] Phase 4: History/Übungen/Templates mit derselben lokalen Datenquelle.
- [ ] Phase 5: Programme/Body/Profil vollständig migrieren.
- [ ] Phase 6: Account-Isolation und Auth-Deep-Links inklusive Geräteabnahme.
- [ ] Phase 7: Postgres-RPC, Outbox, Tombstones, Konflikte und RLS-Tests.
- [ ] Phase 8: Accessibility, Sprachkonsistenz und gezieltes Profiling.
- [ ] Phase 9: authentifizierter Coach mit Limits und transparentem Fallback.
- [ ] Phase 10: Release-Gates, TestFlight und Android interne Tests.

Jede Phase braucht Tests, aktualisierte Dokumentation und überprüfbare Akzeptanz. Detailumfang, Risiken und Schätzungen: Audit Abschnitt 16. Keine Phase wegen eines grünen JS-Bundles als native Abnahme markieren.
