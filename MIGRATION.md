# Migration – aktueller Stand

Referenz: 570383a. Native Modernisierung auf rebuild/clean-mobile-app, keine Änderung der Referenzkopie.

Implementiert: gemeinsame SQLite-Dokumentdatenbank für die elf createHydratedStorage-Stores. Erstimport liest MMKV und bei fehlendem Wert AsyncStorage, validiert Schema/Version und schreibt Dokument plus Originalbytes plus Marker in einer Transaktion. Danach wird nur SQLite als aktiver Speicher gelesen. Fehlgeschlagene Imports erhalten die Quelle und setzen keinen Marker. Details und Tabellen: DATABASE.md.

Workout-IDs, fertige Session und Datumsfelder bleiben erhalten. Bekannte Achievement-v1-Daten erhalten repeatCounts ohne XP-Verlust. ISO-Textnotizen bleiben Text. Unbekannte defekte Formate werden gesperrt; es gibt noch keine universelle automatische Reparatur.

Ein lokaler Reset entfernt auch alte native Quellen und Backups, behält aber Importmarker. Varianten mit unterschiedlichen Bundle-/Paket-IDs haben getrennte Sandboxes; ein Development-Build liest keine Production-Sandbox aus.

Noch erforderlich: echte Altbestände auf iPhone/Android prüfen, App-Kill während Import/Finish, Mengen-/Volumenvergleich großer Verläufe, normalisierte Tabellen und Owner-Grenzen. Auth-Token-Migration, Cloud-DTOs und RLS sind nicht Teil dieses lokalen Imports. Kein Downgrade zu alten App-Binaries als unterstützter Weg; vor realer Migration einen vollständigen externen Export bereitstellen.
