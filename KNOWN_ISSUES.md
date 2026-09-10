# Bekannte Probleme

Vollständige Referenzbefunde B01–B23: docs/AUDIT_2026-09-10.md. Aktuell besteht keine Releasefreigabe. Höchste Priorität: Startup/Recovery-Löschung, Queue-Rennen, Hydration-Datenverlust, Benutzerisolation, öffentlicher Providerkey-Pfad.

Weitere offene Gates: SQL-Transaktionen, NULL-Mapping, Tombstones, Default-IDs/Seed, Auth-Callback, Server-Rate-Limit, vollständiger Export/Löschung, Migration und Geräte-E2E. Referenz-Dependency-Audit meldete 71 Advisories inkl. tar critical; tatsächliche Exposition gesondert prüfen.

Baseline bestanden: Typen, Lint, 136 Tests, Web- und native JS-Bündelung. Nicht bestanden/fehlend: Expo-Patchcheck (3 Abweichungen), echte iOS/Android-/Backend-Abnahme. Behobene IDs und neue Testzahlen nach Implementierung ergänzen; nicht den historischen Auditbericht umschreiben.
