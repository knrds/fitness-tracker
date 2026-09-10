# Architektur

Hybrid-Modernisierung im bestehenden Monorepo. apps/mobile/app enthält Expo-Routen, packages/domain React-freie Business Logic, packages/ui Volt-Tokens und Primitives.

## Aktueller Vertikalschnitt
Auf iOS/Android öffnet src/data/deviceDatabase.native.ts über expo-sqlite eine gemeinsame training.sqlite. DocumentDatabase stellt parametrisierte Dokumentzugriffe, Schema-Versionierung und synchrone Transaktionen bereit. Alle elf bisher über createHydratedStorage gespeicherten Stores nutzen nativ diese Datenbank. Auth-Token-Speicher bleibt separat und ist noch zu modernisieren.

Zustand bleibt die UI-Projektion. Der Speicheradapter validiert Import und native Writes. Beim Finish werden History, vorhandene Outbox-Queue, XP, Koffein und aktiver Zustand in einer SQLite-Transaktion geschrieben. Bei Fehlern werden auch die beteiligten Projektionen zurückgesetzt. Normale fehlgeschlagene Workout-Änderungen behalten den alten Stand und melden einen UI-Fehler. Der Queue-Worker startet erst im folgenden Microtask, nach dem lokalen Commit.

PersistenceGate hält Trainingsaktionen und Auth-Initialisierung bis zum erfolgreichen Laden aller Stores zurück. Unlesbare Daten blockieren die App, statt überschrieben zu werden. Plattformdateien trennen native SQLite von der optionalen Web-Vorschau, die weiterhin KV verwendet.

## Bewusste Grenze
Die erste Stufe speichert validierte Store-Dokumente, keine vollständig normalisierten Session-/Set-/Outbox-Zeilen. Das ersetzt elf getrennte native Speicherorte ohne einen parallelen, unbenutzten Datenpfad einzuführen. Große History-Snapshots und synchrone Writes müssen vor Release gemessen und durch granulare Repositories ersetzt werden.

Nächste Stufe: normalisierte Sessions/Sets/Outbox, Benutzerpartitionen und vollständige Befehlsgrenzen. Benutzerwechsel, Remote-Konflikte und serverseitige Transaktionen sind weiterhin offen. Nicht jede Store-Aktion und nicht der gesamte Datenreset sind bereits transaktional.
