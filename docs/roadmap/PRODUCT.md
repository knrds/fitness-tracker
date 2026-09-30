# Produktvertrag

EVARO ist ein deutsch-/englischsprachiger Fitness-Tracker für iOS und Android mit nutzbarer Web-Beta. Training funktioniert lokal; Cloud-Sync und Coach sind zusätzliche Datenflüsse mit eigenen Freigaben. Keine medizinische Diagnose oder Therapie, kein soziales Netzwerk im aktuellen Releaseumfang.

## Bestehende Kernfunktionen erhalten

| Bereich | Verbindliches Verhalten / Regressionsziel |
| --- | --- |
| Workout | Ein gemeinsamer Satzeditor für Live-Training, Vorlagen und abgeschlossene Trainings. Unabhängige Satzwerte, Dezimalkomma, Gewicht und Wiederholungen vollständig in nachfolgende leere Felder übernehmen; bewusst gesetzte Werte erhalten. Finish/Update/Discard genau einmal pro akzeptierter Aktion; vollständiger Swipe löscht Satz ohne Overlayfehler. |
| Historie | Sichere Bearbeitung/Löschung, korrekte Neuberechnung, kein zweites XP durch Edit. Unsaved-Changes-Dialog bei Back/Swipe. Vergleich mit jüngstem früheren passenden Übungsvorkommen, aktive Session ausgeschlossen; Teilfortschritt nicht als endgültiger Rückgang ausgeben. |
| Satzstatistik | Abgeschlossene Arbeitssätze einschließlich Drop-Sätzen zählen, Warmup ausnehmen, Failure nicht doppelt. Gemeinsame Domainlogik für Dashboard, Verlauf, Muskelansicht und Statistiken. |
| Muskelansicht | Primärmuskel 1, sekundär 0,5 als Darstellungsheuristik, keine physiologische Messung. Alle dargestellten Regionen such-/filterbar (DE/EN); stärkster Heatmap-Bucket verwendet stärkstes Token. Ringe relativ zum führenden Anteil; Prozentbeschriftung bleibt tatsächlicher Anteil. |
| Planung | Nur GK und PPL als System-Splits mitgeliefert, klar gekennzeichnet, weder editierbar noch löschbar; Schutz auch im Programm-Editor/Store. Templates, Programme und Ordner aus-/einblendbar; Ordnerzustand persistent. Vorhandenen Ordner auswählen oder neuen anlegen. |
| Tagestraining | Lokale Zeit, Datum/Zeitzone und Programmzuordnung beachten. Erledigte heutige Einheit bleibt erledigt; Folgetag wird nicht zu heute. Zusätzliches freies Workout bleibt startbar. |
| Dashboard | Level-Fortschrittskarte standardmäßig aus, über Profil einschaltbar. Wochenzyklus standardmäßig zu, expandierbar und persistent. Kleine Profil-/Ranganzeige darf bestehen bleiben; keine Premium-Themen-Werbung über dem Dashboard. |
| Notizen / Körper | Dauerhafte Notizen zuerst, einmalige umschaltbar. Date-only-Eingaben über gemeinsamen DateWheelPicker; lesbare Touch-/Desktop-Bedienung. Körpermaßdialog ausreichend groß. Avatar nach Neustart persistent. |
| Navigation | Einheitlicher linker Back-Pfeil, einfache Plus-Aktion an derselben Headerposition, konsistente Focus-Rundungen; geeignete Edge-Swipes bestätigen ungespeicherte Änderungen. Schmale Workout-Header und Tastatur dürfen Aktionen nicht abschneiden. |
| Coach | Senden und neuer Chat funktionieren; neuer Chat/Accountwechsel entwerten alte Antworten. Nur validierte Planvorschläge, Vorschau und explizites Speichern; keine autonomen Datenänderungen. Ausfälle/Quoten/fehlende Konfiguration ehrlich anzeigen. |
| Progression | Aktuelle XP-Ökonomie: Referenzworkout 16 Sätze / 10.000 kg ≈ 1.314 XP; etwa 225 solcher Workouts bis Level 30 und 1.000 bis 50, ohne Bonus-XP. Bestehende XP/Level nicht rückwirkend migrieren. Schätzungen sind keine Leistungsbewertung. |

## Zugang und Design

Free erlaubt drei eigene Templates und ein eigenes Programm. Datenschutz, Export, Löschung und Support sind niemals hinter der Paywall. Downgrade löscht keine Nutzerdaten. Pro/Coach-Funktionsgrenzen zentral in `packages/domain/src/schemas/entitlements.ts` prüfen; Preis-, Trial- und finale Storeproduktentscheidungen sind noch offen. Bestehende Client-Capabilities sind UX, keine Serverautorität.

Beta Tester ist nur in expliziter Beta-Umgebung standardmäßig aktiv und schaltet Beta-Funktionen/Cosmetics frei. Ein Clientflag darf weder Produktionsauthentifizierung noch kostenpflichtige Serverrechte vergeben. Ein manipulierter Client ist im Bedrohungsmodell vorgesehen.

Themes: Standardpalette Glacier Core/Arctic Lab, sechs auswählbare Light- und sechs Dark-Modi, danach vier Premium-Designs (Ultraviolet, Bordeaux Noir, Mocha Cream, Ink & Cherry). Verde Grove und Soft Slate sind für Neuauswahl deaktiviert, gespeicherte IDs bleiben kompatibel. Gotham Signal ist normal freischaltbar, Petal Rose ersetzt Porcelain Rose. Pro-Zugang und Level-Freischaltung klar unterscheiden; Beta besitzt alle.

Gemeinsame Thumbnailmaße/Anordnung und ursprüngliche UI-Icons beibehalten; Premium-Embleme nur ergänzend. Dezente variierende Hintergründe dürfen keine Texte/Aktionen überlagern. Hydration zentriert; Ultraviolet-Tank/Cyborg, Bordeaux-Vampir/Karaffe, Mocha-Kaffee, Cherry-Tinte erhalten. Anatomie Vorder-/Rückseite und männlich/weiblich: Geschlechtsauswahl setzt den Standard, separate spätere Darstellungsauswahl bleibt möglich. Kein Monokel bei Mocha-Frau. Konfetti unterscheidbar, im sichtbaren Modal-/Handybereich, Reduced Motion beachten.

## Qualitätsziele

Kernabläufe auf kleinen Mobilbildschirmen, Desktop-Web und unterstützten Tablets ohne verdeckte Aktionen/Horizontalüberlauf. Screenreader, große Schrift, reduzierte Bewegung, hoher Kontrast und Touchziele mindestens 44 pt berücksichtigen. Primäraktionen bei Netzwerk-, Berechtigungs- und Storagefehlern verständlich und wiederholbar halten; keine stillen Datenresets.

Messplan statt erfundener Performancefreigabe: 1.000 Workouts / mindestens 10.000 Sätze, lange History/Chats, kalter Start, Wiederaufnahme, Suche, Satzänderung, Finish, Export und Sync auf einem schwächeren Android und aktuellem iPhone messen. P95, Framedrops, Peak-RAM, Payloadgröße und Batterieverhalten protokollieren; Budgets anhand dieser Baseline vor Release festlegen. Node-Benchmarks sind kein Ersatz für Gerätewerte.

## Bewusst nicht V1

Feature-Erweiterungen bleiben bis zur Kern-Releaseabnahme eingefroren. Nutrition, Running/GPS, Marketplace, Community/UGC, öffentliche Profile, HealthKit/Health Connect, Wearables, SMS-Marketing, Session Replay, vollautomatische KI-Aktionen und eigenständiger Web-Checkout brauchen jeweils einen neuen Produkt-/Privacy-/Security-Entscheid. Keine leeren Tabs oder vorgetäuschten Integrationen dafür veröffentlichen. Fern-Push ist optional; lokale Timer-Erinnerungen müssen korrekt funktionieren. Neues Framework, neue Datenbank oder Microservices nur bei belegtem Bedarf.
