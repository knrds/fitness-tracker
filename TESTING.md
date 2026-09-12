# Testnachweise – 12.09.2026

Aktueller Stand: 237 grüne Tests (57 Domain, 173 Mobile, 7 API); Typecheck/Lint und Web-/iOS-/Android-Hermes-Exporte erfolgreich. Neue Regressionen: Such-Leerzeichen/Apps-Alias/Weighted-Suffix; Dezimalkomma ohne Abschneiden; keine Übungs-/Muskel-Meilensteine durch unbearbeitete Übungen. Browser: Programs → Plans, Wochenkopie/-speicherung, Körpermaßauswahl, Satzabschluss/100-kg-Volumen, Kreis-Timer und echte trainingsbezogene DeepSeek-Antwort. Native Tastatur-/Touch-/Screenreader-Prüfung weiterhin ausdrücklich separat.

Aktueller Zusatzlauf: 230 Tests (57 Domain, 166 Mobile, 7 API), Typecheck/Lint und drei Plattform-Exporte bestanden. Neue API-/Clientregression: Kreditfehler inklusive Fehlerobjekt in HTTP 200, keine rohen Providerdetails; Store-Retry ohne Duplikate. Bestehende Reset-Regression deckte den Konflikt mit der Coach-Sperre auf und besteht nach Fix. Reanimated-Testmock um Reduced Motion ergänzt, UUIDs im Retry-Test realistisch eindeutig. Reale Browser-/Provider-Nachweise siehe aktuellsten Abschnitt IMPLEMENTATION_STATUS.md.

227 Tests bestanden: Domain/Vitest 57 Tests in 8 Dateien, Mobile/Jest 164 Tests in 35 Suites, Node API 6 Tests. Keine Tests deaktiviert. Baseline: 136 Tests. Typecheck und Lint erfolgreich. pnpm test enthält nun auch die API-Tests.

Neue Regressionen prüfen regionale Filter, körpergewichtsgeeignete Muskelaktivität, gemessene Drop-Ziele, Abbruch/Kontowechsel während einer Geste sowie echten HTTP-Vertrag statt Chatfallback. API-Tests prüfen Auth, fehlende Konfiguration, serverseitige Modellwahl, tatsächliche Frage, Systemrollen und die Grenze zum lokalen Modus. Providerzugriff wird dabei simuliert. Reale Browserprüfung: Maus-Reorder im Training, Touch-Reorder von Vorlagen, Schulter-Hitmap-Einstieg und lokale Coach-503-Antwort mit sichtbarer Frage/Fehlermeldung; Senden trotz minimiertem Training. Native Gesten und sämtliche Kalender-Dropvarianten bleiben ungeprüft. Web und Hermes für beide Plattformen exportiert; keine signierten Builds.

## Was tatsächlich geprüft wurde
- Recovery einmal nach Hydration, leere/alte Sessions bleiben erhalten.
- Queue-Erweiterung während Upload, Single-flight und dauerhafte Fehlerqueue.
- Ungültiges JSON, unbekannte Persistenzversion, Async-Hydration-Rennen, unveränderte Backups, Schema-Defaults, ISO-Notizen.
- Workout-Hydration für Version 0/1 erhält Session-/Template-/Programm-IDs, Sets und Daten.
- 26 Tests in drei Suites nutzen eine echte SQLite-Engine über node:sqlite (Node 24.13.0, SQLite 3.50.4): Datei erneut öffnen, idempotenter Import, SQL-Fehlerinjektion, Importmarker-Rollback, Backup-Löschung ohne Wiederimport, gebundene SQL-Werte, Versionsschutz, tatsächlicher Store-Finalize inklusive Queue/XP, SQL- und UI-Rollback, einmaliger Retry, fehlgeschlagene Set-Eingabe sowie native Legacy-Importpfade.
- Vier UI-Tests für Ladebarriere, Recovery-Retry und sichtbaren Schreibfehler.
- Lokaler Reset berücksichtigt Coach, Queue und Backup-Cleanup.

Jest-Komponententests mocken die Expo-Gerätebindung. Die drei SQLite-Suites ersetzen nur diese Bindung durch node:sqlite und benutzen dieselbe Repository-/Store-Implementierung. Das ist kein iPhone-Test.

## Zusätzliche Nachweise Phase 3b
- Schema 1→2, unveränderte Originalbytes, vollständiger Schema-/Datenrollback bei späterem Fehler, Einzel-Satz-Update ohne Session-/Übungs-UPDATE, Sortierung und CASCADE, Ablehnung doppelter IDs.
- Tatsächliche Auth-/Store-Hydration mit SQLite: A→B→lokaler Modus→A, isolierte Profile/Coach/Queue, offenes Training, fehlerhafte Zielpartition mit Retry, schnelle Wechsel, Reset nur des aktuellen Kontos.
- Verspäteter Pull, mehrstufiger Upload nach A→B→A, Ack einer alten Queue, verspäteter Coach-Stream und alte native Bestätigung werden abgefangen. Die Cloud-/Gerätebindung wird dabei simuliert, nicht ein produktiver Server.
- UI bleibt beim Kontowechsel gesperrt; unmountete Dialoge lösen als Abbruch auf.
- Babel transformiert dynamische Imports ausschließlich für Jest. Ohne diesen Schritt endete der neue Auth-Integrationstest vor der tatsächlichen Rehydration mit ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG. Keine Tests dafür entfernt oder übersprungen.

## Browserprüfung
Chromium 390×844: erster Start funktioniert; Übung Barbell Curl → 20 kg × 10 → abgeschlossen → Reload → Resume erhält Werte → Finish → 200 kg/1 Set → erneuter Start → History bleibt vorhanden. Leeres Finish zeigt Weitertrainieren/Verwerfen; Weitertrainieren erhält die Session. Gezielte Korruption im Testprofil sperrt die Oberfläche; Retry lässt die beschädigten Bytes unverändert; nach Wiederherstellen der gesicherten Testbytes lädt dieselbe Session wieder.

Screenshots wurden visuell geprüft. Web-Animation meldete einen bekannten useNativeDriver-Fallback. Keine Übertragung von echten Trainingsdaten für diese Prüfung.

## Builds
Expo dependency check und Expo Doctor (18/18 Prüfungen) erfolgreich. Web-Export und Hermes-JS-Export für iOS/Android erfolgreich; beide nativen Bündel enthalten den training.sqlite-Pfad. EAS-Konfigurationen haben getrennte Development-/Preview-/Production-IDs. Kein signierter IPA/APK-Build, keine Geräteinstallation und keine Remote-CI-Ausführung dieses lokalen Branches.

## Befehle
`pnpm install --frozen-lockfile`
`pnpm typecheck`
`pnpm lint`
`pnpm test`
`pnpm --filter @fitness-tracker/mobile exec expo install --check`
`pnpm --filter @fitness-tracker/mobile exec expo export --platform ios --platform android --output-dir dist-native`

Noch erforderlich: echtes iPhone/Android, Flugmodus, OS-Kill, Speicherfehler auf Geräten, Migration realer Altbestände, Performance bei großen Verläufen, zwei Testbenutzer und serverseitige RLS-/Konflikttests.


Browser-Smoke nach Phase 3b (11.09.2026, 390×844): Start aus leerem Profil, Workout-Notiz eingeben, leeres Finish → Weitertrainieren, Root neu laden → Recovery → Resume. Dieselbe Notiz blieb erhalten. Neue Screenshots phase3b-empty-finish.png und phase3b-resumed-workout.png visuell geprüft. Accountwechsel wurde hier in den SQLite-/Store-Integrationstests geprüft, nicht mit einem echten Supabase-Konto im Browser.

## Phase 4a
Acht Domain-Regressionen prüfen komplette Satzdetails, neue IDs/keine Completion-Übernahme, fehlende Werte und echte Nullen, RIR/Rest/Supersets, Wiederholungsbereiche, Zielwertänderungen, doppelte Übungsvorkommen, Warmup-Auswahl und leere Rep-Ziele. Zwei weitere echte SQLite-Tests gehen über den tatsächlichen Store: Finish→Repeat→Add Set→Rehydrate erhält Details und History; Template→Rehydrate→Complete nutzt die vorgeschriebene Pause und explizite 0 korrekt.
### Zusätzlicher Browsercheck Phase 4a
Am 11.09.2026 in Chromium bei 390 × 844: Training mit 20 kg × 10 und RIR 2 abgeschlossen, als „QA Kopierparameter“ gespeichert und aus Home erneut gestartet. Gewicht, Wiederholungen und RIR sind übernommen, der neue Satz ist unbestätigt. Der Vorlagendialog wurde visuell geprüft; sein Hinweis auf gleichförmige Arbeitssätze ist vollständig lesbar. Browserkonsole: keine Fehler, bekannter Animated-Web-Warnhinweis. Screenshots: phase4a-template-dialog.png und phase4a-template-restarted.png. Kein nativer Gerätenachweis.

## Phase 4b.1
Sechs neue Domain-Regressionen: alle Übungsvorkommen pro Datenpunkt; genau ein PR pro Übung/Training; Gewicht und e1RM als unterschiedliche Rekorde; keine Gleichstand-/Warmup-/unbestätigten PRs; keine Null-/fehlenden e1RM-Werte; konsistente Custom-Namen und RIR-Priorität. Die Fehler wurden vor dem Fix reproduziert.

Vier Store-Regressionen: frühere Satzwerte je Übungsvorkommen einschließlich älterer passender Session; tatsächliches Prefill des zweiten Vorkommens; Custom-Curl erzeugt keinen PR durch abweichende Standardformel; doppeltes Vorkommen erhält nur einmal den PR-XP-Bonus (335 statt 435 XP im Test). Vollständiger Testlauf grün. Typecheck erkannte zwei unzulässige explizite undefined-Felder in Testfixtures; diese werden nun korrekt ausgelassen, ohne Typausnahmen.

Browser-Visualprüfung Phase 4b.1: neues, leeres Chromium-Testprofil mit zwei gezielt eingespeisten synthetischen History-Sessions (20×10 + 30×5; 35×5). Verlauf zeigt 350/175 kg Volumen; Progress zeigt drei Sätze in zwei Sessions, initiale e1RM 32,5 kg und Maximum 37,9 kg. Chart-Tap zeigt lesbar „Weight PR“; Screenshot phase4b-history-progress.png visuell geprüft. Der erste Fixture-Versuch enthielt ein ungültiges ISO-Datum und wurde von der Ladebarriere korrekt abgelehnt; nach Korrektur ausschließlich der synthetischen Testbytes war Laden möglich. Dieser Check belegt Darstellung/Hydration, nicht den Finish- oder nativen Datenbankpfad. Diese sind separat durch Store-/SQLite-Tests abgedeckt.
