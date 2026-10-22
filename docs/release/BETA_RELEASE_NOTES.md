# Beta-Änderungen

Letzter annotierter Paket-Beta-Tag: `v0.1.0-beta.8`. Main enthält spätere unversionierte Produktupdates. Aktuelle Freigaben und Blocker ausschließlich in [Projektorientierung](../roadmap/README.md) und [Master-Roadmap](../roadmap/MASTER_ROADMAP.md).

## UX-, Coach- und Security-Update — 22.10.2026

- Datenintegrität: Ein abgehakter Satz übernimmt jetzt die als Platzhalter angezeigten Werte der letzten Einheit, statt leer gespeichert zu werden; abgeschlossene Sätze zeigen keine Platzhalter mehr. Ursache der „verschwundenen“ Gewichte beim späteren Bearbeiten. Bereits leer gespeicherte Altsätze lassen sich nicht rekonstruieren.
- Übungssuche: Unbekannte Übungen direkt aus der Suche anlegen; Name wird übernommen, die neue Übung ist sofort ausgewählt.
- KI-Coach: einzelne Vorlagen statt Zwangsprogrammen, umfangreichere Pläne (bis 16 Übungen/Tag), Bearbeiten bestehender Vorlagen, Anlegen neuer Übungen nach Bestätigung, mehr Kontext (Programm, PRs, Körperwerte, Vorlagen).
- Dashboard: dünne Wochenleiste, Level-Ring ums Profil, „Leere Session starten“ neben der geplanten Einheit; Quick Start aus „Pläne“ entfernt.
- Charts: neue Verlaufsdiagramme für Fortschritt (Gewicht/e1RM/Volumen) und Körperwerte mit Zeitraumwahl und Scrub-Tooltip; Favoriten direkt im Fortschrittskatalog.
- UI-Konsistenz: iOS-artige Datumswalze, App-Schriften überall (fehlende Schriftschnitte geladen, Systemschrift-Fallbacks entfernt), „Vorlage“ statt „Template“, lesbare Datumsanzeigen, Wischgeste zwischen Tabs, sichtbare dritte Ringfarbe in Ultraviolet/Mocha/Ink & Cherry.
- Supply Chain: Critical shell-quote sowie Highs compression/source-map-js/vite auf gepatchte Releases; image-size über Adapter auf 2.0.4; react-native-chart-kit entfernt. node-forge und braces (Expo-/Metro-Toolchain) haben noch keinen Upstream-Fix und bleiben offene Highs.

## PostgreSQL-/Sync-/Inventarcheckpoint — 01.10.2026

- Direkte serverseitige PostgreSQL-Adapter mit geprüfter TLS-/Rollen-/Timeoutgrenze; echtes Löschjournal über Serverneustart hinweg. Eng begrenzte Korrektur für gemessenen Systemuhrversatz.
- Atomarer Workoutvertrag mit Revisionen, Konflikten, Tombstones und Cursor vorbereitet; bestehende Daten bleiben erhalten. Keine automatische Cloudaktivierung oder Änderung des bisherigen Client-Syncpfads.
- Sichere Coach-Anfragekennungen und Cleanup für Timer/Abortlistener; blockierte Anfragen hinterlassen keinen Timer.
- Deterministisches CycloneDX-Quellinventar mit deklarierter Lizenzevidence als SHA-gebundenes CI-Artefakt; offene Lizenzprüfungen sichtbar erhalten.
- Echte zusätzliche SQL-/Node-/Konkurrenz-/Rollbackprüfungen in CI. Keine bezahlten Services oder Provideraufrufe; produktive Löschung, Auth, monetäre Budgets und Storefreigabe bleiben offen.

## Kostenlose Backend-/Security-Grundlagen — 30.09.2026

- Portable private PostgreSQL-Quoten: Tageslimits pro Nutzer und global, getrennte Text-/Bild-/Audiolimits, sichere Reservierung/Wiederholung/Abschluss und Paralleltests. API-Anbindung vorbereitet, standardmäßig ausgeschaltet; produktiver Store und echte Eurokostenmessung bleiben offen.
- Serverkern für sichere Kontolöschung mit frischer Reauth, kontogebundenen Aufträgen, bestätigten Stufen und Wiederaufnahme vorbereitet. Kein aktiver Löschendpoint und keine Cloudlöschung; konkrete Backendadapter fehlen.
- Dependency-Ausnahmen auf tatsächliche Versionen/Pfade begrenzt und mit Re-Review-Frist versehen; neue SQL-Tests in CI. Shell-Gates bleiben auch in Windows-Checkouts ausführbar.
- Lokale Prüfung: 1.280 Tests, Typecheck/Lint/Web-Export/Audit und echte PostgreSQL-RLS-/Quoten-/Paralleltests grün. Keine neue kostenpflichtige Infrastruktur oder Provideraufrufe.

## Konsolidierung — PR #24 / main 39723d8

- Projekt- und Releaseunterlagen in sieben zentralen Dokumenten konsolidiert; redundante AI-/Planungsberichte und ungenutzte Designreferenzen entfernt, Lizenz-/Migrations-/SQL-Nachweise erhalten.
- Kontolöschung verlangt expliziten versionierten Serverbeleg für das ursprüngliche Konto; uneindeutige Antworten und Kontowechsel erhalten lokale Daten. Doppelte lokale Bereinigung entfernt; Teilfehler werden nicht als Erfolg ausgegeben.
- Markdown-Dokumentlinks werden lokal und in CI geprüft.
- Expo-CLI-Undici auf 6.28.1 gepatcht; reproduzierbare WebSocket-Crashregression geschlossen.

Kein neuer Beta-Tag oder Store-Launch. Cloudlöschbackend, atomarer Sync, verteilte Coachquoten und externe Release-Gates bleiben offen.

## Kompaktes Dashboard — PR #23 / main 39b2b3e

Level-Fortschrittskarte standardmäßig aus, über Profileinstellungen aktivierbar. Wochenzyklus standardmäßig eingeklappt, Zustandswahl gespeichert. Dependency-Gates scheitern bei fehlerhaften/unvollständigen Auditreports.

## Premium-/Produktcheckpoint — PR #22 / main 39893fb

Einheitliche Themecards, ruhigere individuelle Premiumhintergründe, männliche/weibliche Anatomie und zentrierte Hydration. Aus-/Einblenden von Ordnern/Templates/Programmen, geschützte Systempläne und Free-Limits, moderne gemeinsame Editoren. Korrigierte Volumenvergleiche, sekundäre Muskelaktivität/Suche und erledigter heutiger Programmstatus. Schmale Workoutheader und sichtbare Modal-Konfettivorschau. Redigierte outbound Telemetrie.

## Beta 0.1.0-beta.8 — historische Version

DateWheel vereinheitlicht, History Edit/Delete und Neuberechnung, scoped Beta-Coach-Gäste, productionfailclosed Betazugang. Avatar-/Storage-Recovery-Hardening in vorherigen Betas. Historische Releaseberichte können aus Git rekonstruiert werden; ihre damaligen Statusangaben sind keine aktuelle Freigabe.
