# Security und Privacy

13.09.2026: Medien werden nach bewusster Auswahl/Aufnahme über den bestehenden Server und OpenRouter verarbeitet. Bilder nur als begrenzte data-URLs, keine Serverabrufe beliebiger Bild-URLs; Rohbilder nicht im Chat persistiert. Eigene temporäre Audiodateien werden freigegeben. Literaturabfrage verwendet feste Suchbegriffe ohne Profil-/Gesundheitsdaten. Modellantworten dürfen keine beliebigen Aktionen ausführen: ausschließlich validierte Planstruktur, Vorschau und expliziter lokaler Speicherknopf, Kontogeneration und SQLite-Transaktion.

Client-Providerkey-Pfad entfernt. Keine Provider-/Service-Role-Secrets im Client. EXPO_PUBLIC_ ist öffentlich. Der öffentliche Coach-Handler prüft Supabase-Sessions und begrenzt Requests im Prozess; verteilte Quoten, Deployment-Härtung und reale Auth-Abnahme bleiben vor öffentlicher Freigabe offen. Supabase URL/Anon-Key sind öffentliche Konfiguration, keine Autorisierung.

Native lokale Persistenz verwendet gebundene SQL-Werte, validierte Zeilen/Dokumente, Foreign Keys, Benutzerpartitionen und atomaren Workout-Abschluss. Fehlerdiagnosen des neuen Speichers enthalten nur Speichernamen, keine Fitness-/Gesundheitsdaten. Migration und Backups bleiben lokal. Lokaler Reset berücksichtigt Legacy-Quellen, Backups, Coach und Queue; Account-/Cloud-Daten werden dabei ausdrücklich nicht gelöscht. Kein Tracking neu eingebaut.

Noch offen und releaseblockierend: historische Eigentümerzuordnung und reale Geräte-/RLS-Abnahme der Benutzergrenzen B04, Token-Speicher/Migration, Coach-Auth/Limits B06, serverseitige Transaktionen/RLS-Nachweise, vollständiger Export und Accountlöschung. SQLite ist noch nicht per SQLCipher verschlüsselt; OS-Schutz, Backups und physische Löschung von SQLite-/WAL-Seiten sind auf Geräten zu prüfen. Kein behaupteter DSGVO-/Security-Abschluss.

Dependency-Audit: 67 Befunde (0 critical, 47 high, 18 moderate, 2 low). Der kritische tar-Befund betrifft den Expo-CLI-Abhängigkeitsbaum und wurde gezielt mit 7.5.19 gepatcht. Weitere Befunde nach realer Build-/Runtime-Exposition bearbeiten, keine pauschale Entwarnung.

Quelle zum tar-Patch: https://github.com/isaacs/node-tar/security/advisories/GHSA-23hp-3jrh-7fpw

EU-Release: Zwecke/Rechtsgrundlagen, Gesundheitsbezug/Art. 9, Datenminimierung, transparente Coach-Übermittlung, Verträge und Drittlandtransfer prüfen. Rechtsquelle: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679

Lokale Accountpartitionen sind jetzt implementiert. UI-Sperre und Generation-Checks schützen gegen alte Pull-/Upload-/Coach-Antworten und Bestätigungsaktionen. Roh-Altbestände bleiben ausschließlich im lokalen Bereich; frühere gemischte Besitzer werden nicht automatisch bereinigt. Der bisherige feste Gastbezeichner bleibt eine offene Migration. Keine automatische Gastdaten-Übernahme mehr beim Login. Das ist keine Verschlüsselungs- oder Backend-RLS-Garantie.
