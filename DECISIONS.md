# Entscheidungen

## ADR-001 – Hybrid statt Komplettrewrite (10.09.2026)
Expo/RN passt zu Windows+iPhone und vorhandenen 136 Tests. Domain/UI erhalten, riskante Datenpfade vertikal erneuern. Flutter/Bare würden die Datenfehler nicht automatisch lösen. Referenz bleibt Commit 570383a.

## ADR-002 – Persistenz vor Cloud
Workouts müssen lokal ohne Account/Netz funktionieren. Ziel: SQLite+Outbox in einer Transaktion. Kleine Zustand-Projektionen, MMKV nur Settings/Import. Keine zweite lokale Wahrheit.

## ADR-003 – Keine stille Löschung
Alter, fehlende abgeschlossene Sets, Zod-Fehler oder drei Sync-Fehler sind keine Löschgründe. Recovery, Quarantäne und sichtbare Fehler statt Defaults ohne Backup.

## ADR-004 – Plattformnachweis
JS-Bundle ist kein signierter nativer Build. Gerätetests bleiben Pflicht. Apple-Mitgliedschaft noch offen. SDK-Majorupgrade separat, damit Recovery-Fixes eindeutig prüfbar bleiben.

## ADR-005 – Gemeinsame SQLite-Dokumente als erster Vertikalschnitt
Am 10.09.2026 ist eine native SQLite-Datenbank mit versioniertem Dokumentenschema eingebunden. Damit kann der bestehende Workout-Befehl sofort History, Queue, XP, Koffein und Abschlusszustand atomar speichern. Bestehende UI-/Domain-Verträge bleiben nutzbar; kein zweiter unbenutzter Datenpfad. Normalisierte Session-/Set-/Outbox-Zeilen bleiben das Ziel, insbesondere wegen großer Verläufe, Benutzerpartitionen und granularer Writes. Elf Integrationstests verwenden echte SQLite statt einer SQL-Attrappe.

## ADR-006 – Fehler sichtbar lassen, Originaldaten behalten
Unbekannte oder beschädigte Altformate sperren die betroffenen Writes und die Trainingsoberfläche. Eine erneute Prüfung ist möglich; automatische Reparatur oder Reset würde Daten erfinden oder löschen. Normale fehlgeschlagene native Workout-Änderungen rollen den UI-Stand zurück und zeigen einen Fehler. Migrationen behalten Originalbytes; ausdrücklich bestätigter lokaler Reset entfernt auch diese Backups. Vollständiger Export, Reparatur-UI und Accountlöschung bleiben eigene Schritte.

## ADR-007 – Gezieltes Dependency-Patching
Expo 54 wurde innerhalb kompatibler Patchstände angeglichen. expo-dev-client ermöglicht eigene Gerätebuilds, expo-sqlite liefert die native Transaktionsbasis. Das UI-Paket verwendet denselben Expo-Patch für seine Haptics-Peerauflösung. tar@7.5.16 wird auf 7.5.19 überschrieben, weil die Expo-CLI noch die betroffene Version bindet. Kein Majorupgrade und kein pauschales audit fix --force. Restliche 67 Advisory-Befunde bleiben offen. Node 24 für lokale Tests, CI und EAS ist explizit konfiguriert.

## ADR-008 – Granulare SQL-Zeilen und serialisierte Accountprojektionen (11.09.2026)
Schema 2 normalisiert Session-/Übungs-/Satz-/Outbox-Hierarchien; Metadaten bleiben pro Zeile validiertes JSON. Die bestehenden Store-Verträge bleiben erhalten, SQL-Differenzwrites vermeiden unveränderte Zeilen. Paging/kleinere JS-Projektionen folgen anhand von Messungen.

Alle Tabellen/KV-Schlüssel werden partitioniert. Alte Daten bleiben unter legacy, Accounts erhalten eigene Bereiche; automatische Gastdaten-Zuordnung ist entfernt. Eine Generation entwertet alte Arbeit auch bei A→B→A. Kontowechsel laden seriell, veröffentlichen den Benutzer erst nach erfolgreicher Hydration und sperren UI bei Fehlern. Historische gemischte Eigentümer werden nicht geraten.

Supabase-Callbacks bleiben synchron; externe Aufrufe werden nach dem Callback eingeplant. Für echte Tests des dynamischen Hydrationspfads wird @babel/plugin-transform-dynamic-import ausschließlich unter NODE_ENV=test aktiviert; Metro verarbeitet dynamische Imports unverändert selbst.

Quellen: https://supabase.com/docs/reference/javascript/auth-onauthstatechange und https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0 sowie https://babeljs.io/docs/babel-plugin-transform-dynamic-import

## ADR-009 – Gemeinsame Planungslogik, bestehender Template-Vertrag (11.09.2026)
workoutPlanning in packages/domain kopiert alle vorhandenen Satz-/Übungsfelder für Wiederholung und Folgesätze, ersetzt IDs und entfernt Completion-Metadaten. Template-Start/Erstellung nutzt alle unterstützten Ziele einschließlich RIR und Rest sowie Superset-Gruppen. Unveränderte Rep-Bereiche bleiben bei Updates erhalten; gleiche Übungen werden nach geordnetem Vorkommen verglichen.

Der bisherige Template-Vertrag beschreibt gleichförmige Arbeitssätze. Ein Save erzeugt Zielwerte aus dem ersten Arbeitssatz und ersetzt kein vollständiges Archiv individueller Sätze. Die Oberfläche erläutert diese Grenze; vollständige Varianten/Zeiten/Distanzen bleiben im Verlauf und beim Wiederholen erhalten. Ein erweitertes Vorlagenformat benötigt später Fachschema, UI, Migration und Serververtrag gemeinsam.
## ADR-010 – Rekordkennzahlen und Übungsvorkommen (11.09.2026)
Geschätzte Kraftrekorde verwenden getBestE1RMs mit positiven, abgeschlossenen Nicht-Warmup-Sätzen. detectPRs übernimmt dieselbe Namensauflösung und aggregiert den stärksten Satz aller Vorkommen; ein Training erhält höchstens einen e1RM-PR pro Übung. Bestehende XP werden nicht rückwirkend geändert.

Der Gewichtsverlauf zeigt ausdrücklich „Weight PR“ und nutzt isWeightPR. Die Domain liefert getrennt isE1RMPR; ihr allgemeines isPR entspricht nun der e1RM-Abschlussauswertung. Die bisherige namensabhängige Schätzformel selbst bleibt unverändert und ist keine validierte Leistungsdiagnostik. Eine Versionierung der Formel und ein kumulativer PR-Ereigniszähler folgen separat.

Verlaufsdiagramm und Gesamtwerte aggregieren alle Vorkommen einer Übung. Beim Prefill/„Last“-Vergleich wird dagegen das gleiche geordnete Vorkommen gesucht; fehlt es im letzten Training, wird das jüngste frühere passende verwendet. Ein fehlendes Vorkommen wird nicht durch die erste Übung ersetzt. Die Trainingskarte berücksichtigt nur bestätigte Nicht-Warmup-Sätze für ihre e1RM-Anzeige.
