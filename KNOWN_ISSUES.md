# Bekannte Probleme und Freigabegrenzen

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

Aktuell 67 Dependency-Befunde: 0 critical, 47 high, 18 moderate, 2 low. Exposition pro Abhängigkeit weiter priorisieren; keine pauschale Unbedenklichkeit. Auth-Tokens bleiben im bestehenden Speicher. Kein SQLCipher/OS-Protection-Gerätenachweis. Export ist unvollständig, Reset noch kein atomarer Gesamtlöschbefehl.

Performance: granulare native Session-/Übungs-/Satz-/Queue-Zeilen, aber weiterhin große JS-Store-Projektionen und Subscriptions. Lokale Accountpartitionen sind umgesetzt; reale Geräte-/Backend-Abnahme bleibt offen. Geräte-Kill/Low-Space/Low-Memory, VoiceOver/TalkBack, Tastaturen und Cloud-RLS sind noch nicht abgenommen.

Web: Unterrouten direkt aufrufen kann im statischen Preview 404 ergeben; über Home navigieren. Ein Animated-useNativeDriver-Warnhinweis im Web ist bekannt. Während erneuten Exports ist dist vorübergehend nicht verfügbar.

B17 in Phase 4a bearbeitet: direkte Wiederholung und Folgesätze erhalten sämtliche aktuellen Details; Template-Pfade erhalten alle bestehenden Zielparameter inklusive RIR/Rest/Gruppe. Änderungserkennung verarbeitet geordnete Übungsvorkommen (Teil von B20), Gewichte/Reps/RPE/RIR/Rest und Rep-Bereiche. Vorlagen bilden weiterhin gleichförmige Arbeitssätze ab; individuelle Satzvarianten und Zeit-/Distanzziele benötigen eine Vertragserweiterung. Die übrige B20-History-Auswertung ist noch offen.
Phase 4b.1: Verlaufssummen und Datenpunkte berücksichtigen alle Vorkommen (B20); Prefill/Last sind vorkommensbezogen. e1RM-PRs werden pro Übung dedupliziert und verwenden auch für Custom Exercises dieselben Namen wie Charts. Gewichtsrekorde sind ausdrücklich beschriftet. B16 bleibt teilweise offen: namensabhängige, unversionierte Schätzheuristik; nachträgliche Namensänderungen können Schätzwerte ändern. Der kumulative Achievement-Zähler zählt weiterhin Übungen mit Gewichtsrekorden statt aller historischen PR-Ereignisse; frühere XP werden nicht migriert. Zeit-/Distanz-/reine Körpergewichtsauswertungen sind noch nicht vollständig.
