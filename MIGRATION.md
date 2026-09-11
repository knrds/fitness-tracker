# Migration – Stand 11.09.2026

Referenz: 570383a. Arbeit auf rebuild/clean-mobile-app in D:\TrainingsAppGPT; Referenzkopie unverändert.

Phase 3a importiert die elf KV-Stores validiert in eine gemeinsame SQLite-Datenbank. Phase 3b migriert Schema 1 atomar zu Schema 2: Session-/Übungs-/Satz-/Outbox-Zeilen, zusammengesetzte Benutzerpartitionen, Foreign Keys und unveränderte Original-Dokumente als lokale Backups. Bei Fehler bleibt die komplette v1-Datenbank erhalten. Details: DATABASE.md.

Session-/Template-/Programm-IDs, fertige Session, RPE/RIR, Rest, Dauer, Distanz, Notizen, Supersets und Datumsfelder bleiben bei dieser Speichermigration erhalten. Die Kopierpfade für bestehende Workout-/Template-Felder sind in Phase 4a erneuert; das Template-Format bleibt auf gleichförmige Zielsätze begrenzt. Bekannte Achievement-v1-Daten erhalten repeatCounts ohne XP-Verlust; ISO-Textnotizen bleiben Text.

Bisherige unpartitionierte Daten bleiben unter legacy. Account-Partitionen lesen diese Daten nicht und erhalten keine automatische Gastdaten-Übernahme. Gemischte historische Besitzer werden nicht geraten oder umgeschrieben. Explizite Übernahme-/Export-/Eigentümerentscheidung und installationsbezogene Gast-ID bleiben offen.

Ein lokaler Reset wirkt nur auf die aktuelle Partition und deren Backups. Im lokalen legacy-Modus werden auch die ursprünglichen nativen KV-Quellen entfernt; Marker bleiben gegen Wiederimport bestehen. Andere Account-Partitionen und Cloud-Daten bleiben erhalten.

Unbekannte defekte Formate sperren UI/Writes und können erneut geprüft werden. Kein pauschaler Reparatur-Reset. Unterschiedliche App-Varianten haben getrennte OS-Sandboxes.

Noch erforderlich: echte iPhone-/Android-Altbestände, OS-Kill während Import/Finish, Mengen-/Volumenvergleich und Performance großer Verläufe, vollständiger externer Export vor realer Migration. Kein unterstützter Downgrade zu alten Binaries. Auth-Token-Migration und serverseitige DTO-/RLS-Migration sind getrennte Schritte.
