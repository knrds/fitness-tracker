# Umsetzungsstand vom 11.09.2026

Audit und erste Kernarbeit sind als überprüfbarer Entwicklungszwischenstand umgesetzt. Repository: D:\TrainingsAppGPT, Branch rebuild/clean-mobile-app. Keine Veröffentlichung, kein Push und kein signierter Gerätebuild.

## Änderungen gegenüber der Referenz

| Before | After |
| --- | --- |
| Erster Start/alte oder leere Sessions können gelöscht werden | Einmalige Prüfung nach Hydration; Resume/ausdrückliches Verwerfen |
| Leeres Finish setzt Training sofort zurück | Bestätigung mit Weitertrainieren/Verwerfen |
| Queue-Lock kommt nach Netzwerkcheck, Snapshot-Ack verliert neue Einträge | Lock vor await, ID-basierter Ack, Live-Queue |
| Wiederholt fehlerhafte Queue-Einträge werden entfernt | Einträge bleiben mit Retry-Fehler erhalten |
| Client kann Providerkey direkt verwenden | Direkter Providerkey-Pfad entfernt; Serverhärtung noch offen |
| Zod-Fehler ersetzen Originaldaten durch Defaults | Original/Backup behalten, Writes sperren, Recovery-Anzeige |
| ISO-Text wird pauschal in Date umgewandelt | Schema-gesteuerte Dates, Text bleibt Text |
| Session-/Template-/Programm-IDs fehlen im Persistenzschema | IDs und fertige Session werden wiederhergestellt |
| Native Stores liegen getrennt in KV-Speichern | SQLite-Schema 2 mit Session-/Übungs-/Satz-/Outbox-Zeilen und einmaligem Import |
| Finish schreibt fünf Zustände ohne gemeinsame Transaktion | SQLite-Transaktion, SQL- und UI-Rollback, einmaliger Retry |
| Fehlgeschlagene Set-Eingabe kann als gespeichert erscheinen | Vorheriger Stand bleibt, verständlicher Fehlerdialog |
| App startet während Stores noch laden | Ladebarriere; Recovery-Aktion mindestens 48 px hoch, Breite max. 420 px |
| Lokaler Reset lässt Coach/Queue/Backups zurück | Diese Daten werden einbezogen; Konto-/Cloud-Daten bleiben ausdrücklich getrennt |
| Streak hängt westlich von UTC am falschen Tag | Lokale Kalenderarithmetik, Zeitzonen-/DST-Tests |
| Expo-Patches uneinheitlich, Dev-Client/EAS fehlen | SDK-54-Patches angeglichen, Dev-Client/SQLite, drei EAS-Profile und Startkommando |
| Kritischer tar-Befund im Buildwerkzeug | Gezieltes Override 7.5.16→7.5.19; 0 critical, weitere 67 Befunde offen |
| CI prüft Typen/Tests | Zusätzlich Lint; Node 24 wie lokaler Testlauf |

| Alle Accounts verwenden dieselben lokalen Stores | Getrennte Partitionen, serielles Rehydratisieren und UI-Sperre beim Wechsel |
| Späte Cloud-/Coach-Antwort kann neue Kontodaten verändern | Generation schützt auch A→B→A und lässt neue Worker-Sperren unverändert |
| Alte Bestätigung kann nach Wechsel Aktionen auslösen | Native Aktionen generationsgebunden, UI-Dialoge abgebrochen, Bildauswahl geprüft |
| Login ordnet Gastdaten automatisch dem Konto zu | Altbestand bleibt lokal; keine automatische Zuordnung oder Übertragung |
| Dynamische Imports im Jest-Pfad waren nicht ausführbar | Babel-Transformation ausschließlich für Tests; realer Hydrationspfad wird geprüft |

## Nachweise
191 erfolgreiche Tests (40 Domain, 151 Mobile), darunter 24 echte SQLite-Integrationstests. Typecheck/Lint, Expo dependency check und Expo Doctor (18/18) erfolgreich. Web- und iOS-/Android-Hermes-Exporte erfolgreich. Browser-Smoke: erster Start, 20 kg × 10, Reload/Resume, Finish, 200 kg/1 Set, History nach Neustart; leeres Finish und beschädigte Speicherbytes geprüft. Siehe TESTING.md.

Lokale Implementierungscommits: e3f79f5 (Recovery), e9b3989 (Queue), 65de5a6 (Client-Key-Pfad), 2868e1b (Kalendertage), 1b0ce4a (Native Build/Dependencies), ff5d8ff (SQLite/Import/Transaktion/UI-Schutz). Ausgangsdokumentation: 64f92c5.

## Sicherheit und Datenschutz
Keine neuen Clientsecrets, keine zusätzliche Telemetrie, keine Übermittlung der Migration/Backups. SQL-Werte werden gebunden. Lokale Backups dienen der Migration und werden beim lokalen Reset einbezogen. Serverseitiger Coach, historische Eigentümerzuordnung/Abnahme der Benutzergrenzen, Auth-Tokens, Cloud-Löschung und restliche Dependency-Befunde verhindern weiterhin eine Releasefreigabe.

## Architekturgrenze und nächster Schritt
SQLite-Schema 2 ist im nativen Pfad eingebunden. Session-/Übungs-/Satz-/Outbox-Zeilen und lokale Accountpartitionen sind implementiert und mit echten SQLite-/Store-Tests geprüft. JS verarbeitet weiterhin ganze Store-Projektionen; vollständige Befehlsgrenzen, Paging, historische Eigentümerentscheidung und Geräteabnahme bleiben offen. Nächste lokale Arbeit: Phase 4, zunächst vollständige Parameter beim Kopieren (B17). iPhone/EAS-Konto sind vorhanden; Apple-Developer-Mitgliedschaft fehlt.

Die Screenshots sind Browsernachweise. Die SQLite-Tests laufen mit echter Desktop-SQLite-Engine hinter der Expo-Bindungsgrenze. Weder das noch ein Hermes-Bundle beweist einen erfolgreichen nativen Gerätebuild.

Phase-3b-Implementierung lokal committed als a4649b5 (normalisierte Persistenz und Accountgrenzen).
