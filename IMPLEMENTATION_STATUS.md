# Umsetzungsstand vom 12.09.2026

## Aktueller Zwischenstand: Navigation, Körperkarte und Bedienung

Die zuvor begonnenen Workout-/Coach-Korrekturen wurden in 9bbbbcc und d47af9f abgeschlossen. Anschließend wurde die neue Nutzerliste umgesetzt.

| Before | After |
| --- | --- |
| Home öffnet einen eigenen Programs-Screen | Einstieg öffnet Plans → Programs; interne Auswahl bleibt über Route-Parameter konsistent |
| Tab-Inhalte bleiben unten stehen | Fokus setzt Listen sanft nach oben; dezente Tab-Überblendung und aktive Icon-Fläche, reduzierbare Bewegung |
| Ausgeklappter Timer als Balken | Animierter Kreis; feste Unterkante, 72–328 px Panel ohne Federbewegung |
| Kleine Übungsliste, dominanter Fun Fact | Breitere Abschluss-/History-Dialoge, mehr Platz für Satzdetails, kompaktere Zusatztexte; Abschluss enthält Übungsdetails und Arbeitsvolumen |
| Achievements nur nach Typ markiert | Einmalige Erfolge mit „Absolviert“, wiederholbare mit Anzahl einschließlich 0 |
| Geplante Übungen können Erfolge auslösen | Übungs-/Muskel-Meilensteine und ihre Fortschrittsanzeige zählen nur tatsächlich abgeschlossene Sätze; Regression zunächst rot, danach grün |
| Generischer Coach-Auftrag | Trainingsbezogene Themen, vorhandenes Profil/Log berücksichtigen, kurze Antworten, fachfremde Anfragen zurückweisen |
| Grobe alte Körperzeichnung | Größere menschliche Front-/Rückseitenformen mit feineren Konturen und beschrifteten 44-px-Zielen; MIT-Herkunft dokumentiert |
| Statische XP-Leiste und Emoji-Abzeichen | Animierte XP-Leiste in Home, Profil und Achievements; Higgsfield-Abzeichen als Sprite; Level-Dialog nutzt dasselbe Set |
| More Metrics zeigt nur leere Felder | Körperkarte zur Bereichswahl, sichtbare Umfangswerte, animierter Auswahlwechsel |
| Trinkfortschritt nur als Balken | Animierter Wasserbehälter; Zahlen und bestehende Plus-/Minusaktionen bleiben erhalten |
| Körperfett ohne Erklärung | Info-Aktion erklärt Prozentwert mit Rechenbeispiel und Grenzen der Einordnung |
| Programme schwer zu bearbeiten | Direkter Einstieg in ausgewählte Woche, leere Woche anhängen, Woche mit neuen IDs duplizieren; Save-Vertrag bleibt explizit, belegte Wochen beim Verkürzen geschützt |
| Enge Aktionen im Wocheneditor | Titel und Aktionen in getrennten Zeilen, größere Ziele, kürzerer Screen-Titel |
| Suchbegriffe mit Leerzeichen oder Apps liefern keine Treffer | Gemeinsame normalisierte Suche für Bibliothek, Picker und Progress; Muskel-Aliase und Erhalt eines exakten Übungsnamens bei Zusatz wie Weighted |
| Dezimalkomma wird bei Körperwerten abgeschnitten | Strenge Komma-/Punktverarbeitung in Body und Profil; ungültige Zusätze werden abgewiesen |
| Fehlende Tastaturzuordnung in einigen Zahlenfeldern | Ergänzte iOS-Zubehörleisten, Abschlussknopf „Fertig“, zugängliche Checkboxen für Satzabschluss |
| Überladene Chart-Achsen und Kurvenüberschwingen | Reaktionsfähige Chart-Breite, bis zu 24 jüngste Einheiten mit ausgedünnten Datumslabels, gerade Messpunktverbindungen und kurze Einblendung |

Abschlussprüfung: **237 Tests** (57 Domain, 173 Mobile in 37 Suites, 7 API), Typecheck und Lint erfolgreich. Web-Export und iOS-/Android-Hermes-Exporte erfolgreich. Dies sind keine nativen Gerätebuilds.

Echter lokaler Providerpfad mit deepseek/deepseek-v4-flash: HTTP 200 für Trainingsfrage; fachfremde Gedicht-Anfrage zurückgewiesen. Frühere HTTP-402-Ursache (Guthaben/Schlüssellimit) wird weiterhin präzise gemeldet; keine dauerhafte Providerverfügbarkeitsgarantie. Browser-Tests erfolgten mit einem isolierten Testprofil, nicht mit dem Trainingsbestand des Nutzers.

Browser bestätigt: Programs-Route /workouts?tab=programs; Woche 1 als Woche 5 angehängt und gespeichert; Körperkarten-Auswahl/Umfangseingaben erreichbar; ein Testtraining mit 12,5 kg × 8 abgeschlossen und als 100 kg Arbeitsvolumen dargestellt; Kreis-Timer mobil geprüft. Screenshots liegen in outputs/followup-*.png. Geräteprüfung von iPhone-Tastatur, VoiceOver, Android/TalkBack, Reduce Motion und echter Touch-Performance bleibt offen.

Higgsfield lieferte das Level-Abzeichenset. Die anatomische Bildgenerierung wurde vom Dienst blockiert; stattdessen werden dokumentierte MIT-Anatomiepfade verwendet. Kein 3D-Modell oder KI-generierter medizinischer Messwert wird vorgetäuscht. Historisch bereits vergebene Abzeichen/XP werden nicht still rückwirkend verändert.

Die folgenden Abschnitte dokumentieren frühere Zwischenstände.

## Abgeschlossener Zwischenstand: Workout-Vereinfachung und echter Coach

| Before | After |
| --- | --- |
| Satz-Schnellleiste und fehleranfällige Fokusumleitung | Entfernt; manuelle Dezimalwerte mit Punkt/Komma bleiben während des Tippens erhalten |
| Scrollen ersetzt Header und entfernt Abbrechen/Minimieren | Gleichbleibender Header mit mindestens 44-px-Aktionsflächen |
| Lange Übungsnamen zwischen vier Werkzeugicons eingequetscht | Titel in normaler Schreibweise; Statistik, Warmup und Scheibenrechner im scrollbar begrenzten Optionsmenü |
| Sehr breite Desktop-Inhalte | Workout maximal 960 px, Coach maximal 920 px, dunkler Hintergrund über volle Breite |
| Koffein-Kommentar „trollst du“ | Hinweis auf mögliche Extra-Null mit Augenzwinkern und Bitte um Mengen-/Einheitenprüfung |
| Freie Timer-Verschiebung, Federbewegung, harter Moduswechsel | Fester unterer Anker, 220-ms-Größenanimation, Reduced Motion, keine automatische Öffnung bei Ablauf |
| Kleine Heatmap-Zeichnungen | Größere Vektorkarte, Front-/Rückseitenüberblendung, Zahlenlegende und beschriftete 44-px-Tasten |
| OpenRouter 402 wird als 502 maskiert | Sichere Fehlercodes und Guthabenhinweis; Startprüfung von Schlüssel/Modell sowie pnpm coach:check |
| Gescheiterte Frage muss erneut eingegeben werden | Erneut-senden-Aktion ohne Nachrichtenduplikat; Hervorhebungen in Antworten lesbar dargestellt |
| Lokaler Reset scheitert an eigener Coach-Sperre | Reset leert Nachrichten direkt unter seiner bestehenden Sperre |
| Resume nach Reload legt zweite Workout-Route an | Bestehende Workout-Ansicht wird weitergenutzt |

230 Tests bestehen (57 Domain, 166 Mobile, 7 API), Typecheck/Lint sowie Web-/iOS-/Android-Hermes-Exporte erfolgreich. Echter OpenRouter-Test zuerst HTTP 402 (Insufficient credits), später HTTP 200 mit deepseek/deepseek-v4-flash; Antwort übernahm die metrische Einheit des isolierten Testprofils. Kein Schlüssel wurde protokolliert. Guthaben-/Modellverfügbarkeit bleibt extern abhängig; keine Garantie gegen spätere Providerfehler.

Browser 390×844 und 1440×1000: Headerposition und Finish unverändert nach Scrollen; Timerhöhe 72–222 px ohne Überschwingen, Unterkante konstant, 29 Zwischenmessungen; 12,5 wird nach Blur/Reload als 12.5 wiederhergestellt; Optionswerkzeuge und Koffeinhinweis erreichbar. Heatmap-Schultertaste per emuliertem Touch erfolgreich (145×44 px), Front/Rückseite geprüft. Screenshots polish-workout-mobile.png, polish-workout-desktop.png, polish-coach-desktop.png und polish-heatmap-mobile.png geprüft.

Neue Nutzerergänzungen folgen nach diesem Zwischenstand: menschlichere Heatmap über Higgsfield, Kreisindikator für ausgeklappten Timer, Navigation/Tab-Übergänge, Suche, Abschlussübersicht, Achievements und weitere Profil-/Body-/Programmverbesserungen. Native Geräteabnahme bleibt offen. Die nachfolgenden Abschnitte beschreiben frühere Meilensteine.

## Aktuell: Bedienung, Muskelregionen und Coach

| Before | After |
| --- | --- |
| Feste Zeilenhöhen, Einklappen beim Berühren | Gemessene Sortierung in fünf Ansichten, Bewegungsschwelle, animierte Nachbarn, Randscrollen, Commit beim Ablegen |
| Kleine Ziehgriffe konkurrieren mit Seitenscrollen | Mindestens 44 × 44, Touch-Steuerung und Accessibility-Aktionen |
| Schulterfilter berücksichtigt nur eine Untergruppe | Regionale Filter einschließlich aller Schultergruppen und sekundärer Muskeln; Heatmap-Einstieg entfernt alte Suchfilter |
| Körpergewichtsübungen bei null kg unsichtbar | Heatmap zählt abgeschlossene Arbeitssätze der letzten sieben Kalendertage |
| Generische lokale Chatantwort | Echter HTTP-Pfad, Servervalidierung, öffentliche Auth, Timeouts und sichtbare Fehler |
| OpenRouter-Key ohne lokalen Server | Loopback-Server, Konfigurationsvorlage, Einbindung in pnpm dev |
| Trainingsleiste verdeckt Coach-Sendeknopf | Eingabe erhält Abstand zur Leiste |
| Separate Vorlagenkopie im Programmeditor | Gemeinsame Domain-Konvertierung erhält unterstützte RIR-/Pausen-/Gruppenziele |

227 Tests bestehen: 57 Domain, 164 Mobile, 6 API; darin 26 reale SQLite-Integrationstests. Typecheck/Lint, Web- und beide Hermes-Exporte erfolgreich. Chromium 390 × 844: Trainingskarten per Maus und Vorlagen per emuliertem Touch umgeordnet; Schulterregion öffnet Übungen; Coach sendet bis zur echten lokalen 503-Antwort und behält die Frage ohne Fake-Antwort. Screenshots shoulders-mobile.png und coach-mobile.png visuell geprüft.

Offen: echter OpenRouter-Aufruf nach Schlüssel-/Modelleintrag in .env.coach.local; HTTPS-Backend für iPhone; native Gesten-/Framerate-Abnahme und sämtliche Kalender-Dropvarianten. PanResponder bleibt die Gestenerkennung. Exporte sind keine Gerätebuilds. Nächster größerer Schritt: Phase 4b.2, granulare Übungs-/Vorlagen-Repositories. Die folgenden Nachweise dokumentieren frühere Meilensteine.

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
| Kopieren verliert RIR/Pausen/Dauer/Distanz/Notizen/Supersets | Gemeinsame Domain-Kopierlogik, neue IDs, keine übernommenen Abschlüsse; native Wiederherstellung geprüft |
| Vorlagen-Änderungsprüfung erkennt Zielwertänderungen nicht zuverlässig | Zielwerte/Gruppe je geordnetem Übungsvorkommen prüfen; Rep-Bereiche beim Update erhalten |
| Gespeicherte Satzpause beeinflusst Timer nicht | Satzpause hat Vorrang; 0 Sekunden startet keinen Timer |

## Nachweise
211 erfolgreiche Tests (54 Domain, 157 Mobile), darunter 26 echte SQLite-Integrationstests. Typecheck/Lint, Expo dependency check und Expo Doctor (18/18) erfolgreich. Web- und iOS-/Android-Hermes-Exporte erfolgreich. Browser-Smoke: erster Start, 20 kg × 10, Reload/Resume, Finish, 200 kg/1 Set, History nach Neustart; leeres Finish und beschädigte Speicherbytes sowie Speichern/Neustart einer Vorlage geprüft. Siehe TESTING.md.

Lokale Implementierungscommits: e3f79f5 (Recovery), e9b3989 (Queue), 65de5a6 (Client-Key-Pfad), 2868e1b (Kalendertage), 1b0ce4a (Native Build/Dependencies), ff5d8ff (SQLite/Import/Transaktion/UI-Schutz). Ausgangsdokumentation: 64f92c5.

## Sicherheit und Datenschutz
Keine neuen Clientsecrets, keine zusätzliche Telemetrie, keine Übermittlung der Migration/Backups. SQL-Werte werden gebunden. Lokale Backups dienen der Migration und werden beim lokalen Reset einbezogen. Serverseitiger Coach, historische Eigentümerzuordnung/Abnahme der Benutzergrenzen, Auth-Tokens, Cloud-Löschung und restliche Dependency-Befunde verhindern weiterhin eine Releasefreigabe.

## Architekturgrenze und nächster Schritt
SQLite-Schema 2 ist im nativen Pfad eingebunden. Session-/Übungs-/Satz-/Outbox-Zeilen und lokale Accountpartitionen sind implementiert und mit echten SQLite-/Store-Tests geprüft. JS verarbeitet weiterhin ganze Store-Projektionen; vollständige Befehlsgrenzen, Paging, historische Eigentümerentscheidung und Geräteabnahme bleiben offen. Phase 4a und 4b.1 sind umgesetzt; nächste lokale Arbeit ist Phase 4b.2 (granulare Übungs-/Vorlagen-Repositories). iPhone/EAS-Konto sind vorhanden; Apple-Developer-Mitgliedschaft fehlt.

Die Screenshots sind Browsernachweise. Die SQLite-Tests laufen mit echter Desktop-SQLite-Engine hinter der Expo-Bindungsgrenze. Weder das noch ein Hermes-Bundle beweist einen erfolgreichen nativen Gerätebuild.

Phase-3b-Implementierung lokal committed als a4649b5 (normalisierte Persistenz und Accountgrenzen).
Phase-4a-Implementierung lokal committed als 672327f (Workoutdetails und Vorlagenziele).
Phase-4b.1-Implementierung lokal committed als c224b66 (History, Übungsvorkommen und PR-Auswertung).

| Before | After |
| --- | --- |
| Verlauf ignoriert spätere Vorkommen derselben Übung | Summen und Datenpunkte erfassen alle Vorkommen |
| Beide Übungsvorkommen erhalten die ersten früheren Satzwerte | Prefill/Last sucht das passende geordnete Vorkommen |
| Doppelte Übung kann zweimal PR-XP erhalten | Ein e1RM-Rekord pro Übung und Training |
| Custom-Namen fehlen in der Abschlussberechnung | Gleiche Namen und e1RM-Auswertung wie im Verlauf |
| Allgemeines PR-Symbol verdeckt unterschiedliche Kennzahlen | Gewichtskurve nennt Weight PR; e1RM-Rekord separat verfügbar |
| Unbestätigte Zielwerte können als beste aktuelle e1RM erscheinen | Nur abgeschlossene Nicht-Warmup-Sätze für die aktuelle Schätzung |

Vorlagen bleiben im bestehenden Datenvertrag gleichförmige Arbeitssätze mit Zielen aus dem ersten Arbeitssatz. Die Oberfläche erklärt diese Auswahl; einzelne Satzvarianten, Zeiten und Distanzen bleiben vollständig im Verlauf und beim direkten Wiederholen erhalten. Es wurde kein vollständiges Vorlage-zu-Workout-Roundtripformat für individuelle Sätze behauptet.
