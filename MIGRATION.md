# Migration

Keine ungeprüfte Übernahme alter Stores in neue Schemas. Vor erstem Import vollständiges unverändertes Backup. Version, Benutzer, Entitäten und Referenzen prüfen. Ungültige Records isoliert aufbewahren; gültige Nachbarn nicht löschen. UUIDs erhalten, außer kollidierende globale Defaultinstanzen mit dokumentierter Zuordnung.

SQLite-Import atomar: begin → Records + Referenzmapping → Summenprüfung → Migrationsmarker → commit. Wiederholung idempotent. Fehler/Abbruch muss zum alten Zustand zurückrollen. Legacy-KV nicht sofort löschen. Nach Neustart aktive Session und History gegen Backup vergleichen.

Gastdaten gehören zunächst lokalem Profil. Übernahme in Cloudkonto bewusst bestätigen; Konto A darf Konto B nicht beeinflussen. Neue Daten nicht in alte App zurückschreiben, ohne kompatiblen Exportvertrag. Migration ist noch offene Roadmap-Phase.
