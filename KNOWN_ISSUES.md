# Bekannte Probleme und Freigabegrenzen

Security-Fortschritt 19.09.2026: Der unten im Eingangsaudit genannte öffentliche ALLOW_PROTOTYPE_COACH-Auth-Bypass ist inzwischen geschlossen. S6 bleibt offen für Server-Pro, verteilte Budgets/Limits, DE/EN Safety und Live-Abnahme. Nach drei S1-Paketfixes bleiben 57 Audit-Befunde (43 high/14 moderate).

Host-Teststabilität: Im S6-Gesamtlauf überschritt largeDatasetPerformance die Fuzzy-Such-Grenze 50 ms mit 57 ms; isoliert 22 ms und alle fünf Performance-Tests PASS. Kein Suchcode geändert und keine Grenze aufgeweicht. Diese Host-Zeitmessung ersetzt keine native Performance-Abnahme; Wiederholungslauf/Nachweise in EXECUTION_STATUS.md.

19.09.2026 — Astra-Audit auf `6471138`: Native SecureStore-Integration in Review-Branch implementiert/hostgetestet; reale Größen-/Migrations-/Rollback-/Backup-Abnahme offen. RLS-Harness ist nicht ausführbar gegen das dokumentierte Schema (falsche Spalten, fehlende Assertions); keine produktive RLS-Freigabe. Sync ignoriert mehrere Child-Delete-/Pull-Fehler und ersetzt Cloud-Aggregate ohne Transaktion. Account-Delete-Client bestätigt keine explizite Backend-Erfolgspayload und bindet Cleanup nicht an die ursprüngliche Kontogeneration. AI-Safety antwortet ausschließlich DE; `ALLOW_PROTOTYPE_COACH` kann Auth umgehen; globaler Pro-Beta-Bypass aktiv. Aktuelle Matrix/Gates: `docs/release/P0_READINESS_MATRIX.md` und `EXECUTION_STATUS.md`. Historische Testzahlen unten sind keine aktuelle Baseline.

13.09.2026 – UI-Rework: Alle Bildschirmfamilien auf gemeinsame Glacier-/Amber-Tokens umgestellt; animierte Navigation/Segmente/Disclosure, responsive Workout- und Template-Felder, Programmlisten, Profil/Auth und Diagramme im Browser geprüft. Echter Coach trennt einzelne Templates von expliziten Programmen; „Wochenprogramm“/„Split“ werden jetzt ebenfalls als strukturierte Erstellung erkannt. Aktuelle Details und Prüfnachweise: UI_REWORK.md, DESIGN.md, IMPLEMENTATION_CHECKLIST.md. Die folgenden älteren Zwischenstände sind keine aktuelle UI-Aufgabenliste.

13.09.2026: Aktuelle Nutzerkorrekturen und multimodaler Coach implementiert und auf dem Host geprüft. Weiter offen: echte Mikrofon-/Tastatur-/Animationsabnahme auf iPhone/Android, native HTTPS-Anbindung, öffentliche Auth-/RLS-/Quotenabnahme und Cloud-Transaktionen. expo-av wird im bestehenden SDK-54-Projekt weiterverwendet; vor dem nächsten SDK-Upgrade auf expo-audio umstellen. Neu direkt deklarierte expo-file-system-Abhängigkeit entspricht Expo 54 und dient ausschließlich dem begrenzten Lesen/Freigeben eigener temporärer Aufnahmen. Provider können trotz Retry ausfallen; fehlerhafte Pläne werden sichtbar abgelehnt.

Aktuell: Die weitere UI-Liste inklusive Kreis-Timer ist implementiert und mit 237 Tests geprüft. Generative Anatomie wurde von Higgsfield blockiert; es wird eine lizenzierte anatomische Vektorkarte verwendet, kein 3D-Scan. Historisch zu früh vergebene Übungs-/Muskel-Abzeichen werden nicht rückwirkend automatisch entzogen. iOS-Zahlenzubehör, Touch-Performance und Screenreader sind noch auf echten Geräten zu prüfen. Die nachfolgenden Hinweise enthalten historische Zwischenstände.

Aktualisierung: Schlüssel/Modell sind inzwischen konfiguriert; echter DeepSeek-HTTP-200-Aufruf bestätigt. Vorheriger 402-Guthabenfehler wird präzise ausgewiesen. Lokaler Browser-Coach abgenommen, iPhone benötigt weiterhin HTTPS-Backend und native Abnahme. Timer nun verankert und sanft animiert; gewünschter Kreisindikator und weitere UI-Ergänzungen folgen separat.

12.09.2026: Gemessene Drag-and-drop-Logik in fünf Ansichten; Browser-Maus/Touch geprüft, native Geräteperformance und sämtliche Kalender-Dropvarianten offen. Schulterfilter und körpergewichtsgeeignete Heatmapzählung korrigiert. Coach mit echtem HTTP-Pfad ohne Ersatzantwort. Lokal fehlen OpenRouter-Schlüssel/Modell; für iPhone zusätzlich HTTPS-Backend. Öffentliche Auth/Prozesslimits implementiert, verteilte Quoten und echte Backendabnahme fehlen.

Keine Releasefreigabe. Der historische Audit B01–B23 bleibt in docs/AUDIT_2026-09-10.md.

## Bearbeitet
- B01: Start/Recovery löscht keine neuen oder alten Sessions mehr; auch leeres Finish verlangt ausdrückliches Verwerfen.
- B02/B08: Worker vor erstem await gesperrt, Ack anhand ID, parallel angefügte und fehlgeschlagene Operationen bleiben erhalten.
- B03: Rohdaten/Backups behalten, validierte Werte verwendet, UI bis Hydration gesperrt. Unbekannte defekte Altformate benötigen weiterhin gezielte Reparatur.
- B05: Client-Providerkey-Pfad entfernt. Serverseitiger Coach B06 bleibt unsicher für öffentlichen Betrieb.
- B11 teilweise: lokale Backups, Coach und Queue werden beim lokalen Reset berücksichtigt; Account-/Cloud-Löschung bleibt offen.
- B14 nativ: gemeinsamer SQLite-Commit für Workout/History/Queue/XP/Koffein mit Rollback. Web-Vorschau weiterhin ohne dieselbe Transaktionsgarantie.
- B15: lokale Kalenderarithmetik mit LA/Berlin/UTC-/DST-Regressionen.
- B23 teilweise: Expo-Patchprüfung grün; tar 7.5.16 gezielt auf 7.5.19 korrigiert.

- B04 teilweise: lokale Partitionen für alle Stores/Backups, serialisierter Kontowechsel, Generation gegen alte Anfragen und Bestätigungen; A→B→Gast sowie A→B→A in Hosttests. Unpartitionierte historische Besitzer, feste Gast-ID, sichere Token und reale RLS-/Gerätenachweise offen.
- B14 erweitert: normalisierte Session-/Set-/Outbox-Zeilen mit Foreign Keys und Rollback; v1-Migration getestet.

## Weiterhin kritisch
B04 historische Eigentümerzuordnung/Abnahme der Benutzergrenzen, B06 Coach-Auth/Limits, B07 Remote-Transaktion, B09 NULL-Mapping, B10 Pull-Konflikte/Fehler/Tombstones, B12 Auth-Callbacks, B13 globale Default-IDs/Seed. Keiner dieser Punkte wurde durch den lokalen SQLite-Vertikalschnitt als gelöst erklärt.

Historischer Dependency-Audit: 67 Befunde (0 critical, 47 high, 18 moderate, 2 low); keine neue Dependency-Freigabe durch den UI-Umbau. Auth-Tokens bleiben im bestehenden Speicher. Kein SQLCipher/OS-Protection-Gerätenachweis. Export-Schema 2 umfasst die lokalen Datenbereiche einschließlich Plänen, Coach und aktuellem Workout; ein Restore-/Import-Vertrag fehlt weiterhin. Native Reset-Store-Writes sind atomar, die vorherige Backup-Löschung und Web-KV-Writes nicht.

Performance: granulare native Session-/Übungs-/Satz-/Queue-Zeilen, aber weiterhin große JS-Store-Projektionen und Subscriptions. Lokale Accountpartitionen sind umgesetzt; reale Geräte-/Backend-Abnahme bleibt offen. Geräte-Kill/Low-Space/Low-Memory, VoiceOver/TalkBack, Tastaturen und Cloud-RLS sind noch nicht abgenommen.

Web: Unterrouten direkt aufrufen kann im statischen Preview 404 ergeben; über Home navigieren. Ein Animated-useNativeDriver-Warnhinweis im Web ist bekannt. Während erneuten Exports ist dist vorübergehend nicht verfügbar.

B17 in Phase 4a bearbeitet: direkte Wiederholung und Folgesätze erhalten sämtliche aktuellen Details; Template-Pfade erhalten alle bestehenden Zielparameter inklusive RIR/Rest/Gruppe. Änderungserkennung verarbeitet geordnete Übungsvorkommen (Teil von B20), Gewichte/Reps/RPE/RIR/Rest und Rep-Bereiche. Vorlagen bilden weiterhin gleichförmige Arbeitssätze ab; individuelle Satzvarianten und Zeit-/Distanzziele benötigen eine Vertragserweiterung. Die History-Auswertung wurde anschließend in Phase 4b.1 erweitert; Grenzen siehe unten.
Phase 4b.1: Verlaufssummen und Datenpunkte berücksichtigen alle Vorkommen (B20); Prefill/Last sind vorkommensbezogen. e1RM-PRs werden pro Übung dedupliziert und verwenden auch für Custom Exercises dieselben Namen wie Charts. Gewichtsrekorde sind ausdrücklich beschriftet. B16 bleibt teilweise offen: namensabhängige, unversionierte Schätzheuristik; nachträgliche Namensänderungen können Schätzwerte ändern. Der kumulative Achievement-Zähler zählt weiterhin Übungen mit Gewichtsrekorden statt aller historischen PR-Ereignisse; frühere XP werden nicht migriert. Zeit-/Distanz-/reine Körpergewichtsauswertungen sind noch nicht vollständig.
