# Architektur

Hybrid-Modernisierung im Monorepo: apps/mobile/app enthält Expo-Routen, packages/domain React-freie Business Logic, packages/ui Volt-Primitives.

## Persistenz und Befehle
Auf iOS/Android öffnet deviceDatabase.native.ts über expo-sqlite die training.sqlite (Schema 2). Alle elf Stores verwenden dieselbe Datenbank. Zustand ist die UI-Projektion. Aktive und abgeschlossene Workouts, Übungen, Sätze und Outbox-Aufträge liegen in getrennten Zeilen; kleinere Store-Zustände bleiben validierte JSON-Dokumente. Die Repository-Schicht rekonstruiert beim Laden die bestehenden Store-Verträge. Es gibt keinen parallel genutzten alten History-Datenpfad.

Ein Satz-Update schreibt nur geänderte Satz-/Metadatenzeilen. Unveränderte Session-/Übungszeilen bleiben erhalten. Fremdschlüssel mit CASCADE sichern die Hierarchie. Das Repository bindet Werte und verwendet ausschließlich intern definierte Tabellen-/Spaltennamen. Details: DATABASE.md.

Der Finish-Befehl schreibt History, Queue, XP, Koffein und Abschlussstatus atomar. SQL-Fehler setzen auch die fünf UI-Projektionen zurück. Der Worker startet nach dem synchronen Commit. Noch nicht jeder andere Store-Befehl ist vollständig transaktional.

## Benutzergrenzen
Jede Tabelle einschließlich Dokumenten, Importmarkern und Backups enthält eine Partition. Account-Daten liegen unter account:<validierte UUID>; bisherige lokale Daten bleiben in legacy. Web verwendet entsprechend getrennte KV-Schlüssel. Es erfolgt keine automatische Gastdaten-Zuordnung oder Übertragung beim Login.

Ein serialisierter Kontowechsel sperrt die Oberfläche, verwirft die alten UI-Projektionen ohne Speicher-Write und hydratisiert alle elf Stores aus der Zielpartition. Erst nach erfolgreichem Laden wird das Konto freigegeben. Eine Generation entwertet alte Connectivity-, Pull-, Upload- und Coach-Antworten auch bei A→B→A. Native Bestätigungsaktionen sind an ihre Generation gebunden, UI-Dialoge werden beim Wechsel abgebrochen, verspätete Bildauswahl wird ignoriert.

PersistenceGate wartet auf Daten und Kontoauflösung. Fehler lassen die Oberfläche gesperrt und erlauben Retry. Supabase-Callbacks bleiben synchron; Cloud-Aufrufe starten außerhalb des Auth-Callbacks.

## Grenzen
Die UI serialisiert und liest weiterhin ganze Store-Projektionen; SQL-Writes sind granular, die JS-Verarbeitung großer Verläufe noch nicht. Datenbankzeilen enthalten validierte Metadaten-JSONs, keine vollständig spaltenweise normalisierten Fachattribute. Paging, Messungen auf Geräten, vollständige Befehlsgrenzen, Revisionen und Tombstones folgen.

Historische unpartitionierte Daten können bereits gemischte Besitzer enthalten und bleiben im lokalen Altbestand. Eine explizite Eigentümer-/Importentscheidung sowie ein neuer installationsbezogener Gastbezeichner fehlen. Auth-Token-Speicherung, reale RLS-Abnahme und sichere Cloud-Transaktionen bleiben offen.
