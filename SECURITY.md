# Security und Privacy

S6-Korrektur 19.09.2026: ALLOW_PROTOTYPE_COACH ist wirkungslos; öffentliche Requests benötigen geprüfte Supabase-Authentifizierung. Header/Body/Forwarded-IP können keine lokale Identität setzen; diese serverinterne Entwicklungsausnahme ist bei NODE_ENV=production oder VERCEL gesperrt. Alte anonyme Prototype-Quota entfällt. Keine Änderung an Providerkeys, Datenpersistenz oder Remote-Deployment. Echte Serverentitlements, verteilte Limits/Budget, Kill-Switch, zweisprachige Safety und Live-Abnahme fehlen weiterhin.

## Dauerhafter Security-Vertrag (19.09.2026)

### S1: gezielte Dependency-Korrekturen

Nach Governance-Commit `27fccac`: drei eng begrenzte Overrides, ohne SDK-/Hauptversionswechsel: nanoid 3.3.12 → 3.3.18, undici 6.26.0 → 6.28.0, tar 7.5.19 → 7.5.21 (ursprüngliche Expo-Anforderung 7.5.16). Lockfile-Diff enthält ausschließlich diese drei Paketauflösungen samt Integritäten und ihren Referenzen. Nutzen: DoS in ID-Generierung/Archivfilter und HTTP-Header-Injection schließen. Nanoid liegt auch im tatsächlichen React-Navigation-/Router-Clientpfad; Expo CLI konsumiert tar/undici. Kein Nachweis, dass jede Advisory über EVARO extern ausnutzbar war.

`pnpm test:security` ist in `pnpm test`/`pnpm verify` integriert und prüft die vom installierten Expo-/Router-Baum tatsächlich aufgelösten Pakete. Vier vor dem Update reproduzierbar fehlgeschlagene Angriffsregressionen: negative nicht-kryptografische ID-Länge, Null-Länge im Custom-Generator, GNU-LongPath-Archiv mit Member-Filter, CRLF in blob-artigem Content-Type. Begrenzte Kindprozesse (64 MB Heap, fünf Sekunden Timeout), HTTP ausschließlich Loopback; normale ID-Erzeugung und gültiger HTTP-Request als Positivkontrollen. Keine Datenmigration oder Produktivdaten berührt.

Lizenzmetadaten der drei installierten Versionen: nanoid/undici MIT, tar BlueOak-1.0.0; vorhandene Hinweise erhalten. Node-Engine-Anforderungen passen zu Node 24. Dies ersetzt keinen vollständigen Dependency-/Medien-Lizenznachweis. Rollback des Lockfiles würde bekannte Lücken zurückbringen und ist keine erlaubte Release-Risikoakzeptanz.

Quellen: [Nanoid Null-Längen-DoS](https://github.com/advisories/GHSA-2v37-7h3g-55p8), [Undici CRLF-Injection](https://github.com/nodejs/undici/security/advisories/GHSA-m8rv-5g2x-5cg5), [tar LongPath-Rekursion](https://github.com/isaacs/node-tar/security/advisories/GHSA-r292-9mhp-454m). Aktuelle Audit-Zahlen und Abnahme in EXECUTION_STATUS.md.

Verbindlich für alle Agenten: [Guardrails](evaro_release_execution_pack/EVARO_SECURITY_GUARDRAILS.md), [AGENTS.md](AGENTS.md), [Security-Roadmap](evaro_release_execution_pack/EVARO_SECURITY_RELEASE_ROADMAP.pdf). Aktuelle S0–S12-Abnahme: [Readiness-Matrix](docs/release/P0_READINESS_MATRIX.md). Der SecureStore-Checkpoint ist `6c01522`. Die folgenden Kontrollen beschreiben den geprüften Branch, keinen nachgewiesenen Produktionszustand.

### Datenflüsse, Grenzen und priorisierte Bedrohungen

| Fluss / Schutzgut | Vertrauensgrenze / Angriff | Vorhandene Kontrolle | Offenes Gate |
|---|---|---|---|
| UI → Domain → SQLite: Training, Maße, Profil, Programme/Templates | Unvertrauenswürdige Eingaben; beschädigte Daten; Accountwechsel/Crash | Validierung, gebundene SQL-Werte, Transaktionen, lokale Scopes | Altbesitzer/Gastzuordnung; Low-Space/Prozessabbruch/Backup auf Geräten |
| App → Supabase Auth → OS-Keychain/Keystore | Tokenverlust/-diebstahl; Migration/Logout-Race; Deep-Link-Replay | Dual-Read mit Readback, serialisierte Operationen, Logout-Marker | Native Payloadgrenzen, Reboot/Restore, Callback-/Reauth-Abnahme |
| Outbox → Supabase REST/Postgres | BOLA/fremde FK-IDs, Replay, unvollständige Aggregate, parallele Geräte | Client-Scope/FIFO und dokumentierte RLS | Servertransaktionen, echte CRUD-Isolation, Idempotenz/Konfliktmodell |
| App → Coach API → OpenRouter | Auth-Bypass, Prompt Injection, medizinische Schäden, Kostenmissbrauch, Kontextabfluss | Serverkey, Validierung, Timeout, deterministische Safety; Prototyp-Bypass geschlossen | Serverentitlement/Budget, locale-aware Safety; Hosting/DPA und echte Auth-Abnahme |
| Delete/Export → Cloud/Auth → lokaler Cleanup | Fremdkontolöschung, Race nach Accountwechsel, falscher Erfolg | Defensiver Cliententwurf/lokaler Export | Expliziter Backend-Erfolg, Cascade/Auth-Delete, Scope, vollständiger Export |
| Store/Billing → App/API | Manipuliertes Client-Pro, Replay/Webhook-Fälschung | Providerunabhängiger Entwurf | Native Käufe/Restore und serverseitige Quelle, Beta-Bypass |
| Git/Dependencies/CI → signiertes Binary | Exfiltration durch Buildtools, kompromittierte Actions/Secrets, verletzliche Pakete | Frozen Lockfile, SHA-Pins, Leserechte, History-/Bundle-Scanner | Audit-Fixes, SAST/Lizenzen, geschützte Branches/Environments, Signing-IAM |
| Diagnostics/Support/Backups | Gesundheitsdaten-/Tokenleak, Linkability/zu lange Speicherung | Lokaler begrenzter Buffer und Redaktion | Metadaten-Allowlist, Betriebs-Retention, Cloud-Restore-/Incidentnachweis |

Damit sind Spoofing, Manipulation, unzureichende Nachweisbarkeit, Offenlegung, Verfügbarkeit und Rechteausweitung sowie Verknüpfbarkeit/Datensparsamkeit erfasst. Kein formaler Pentest oder vollständiger LINDDUN-Nachweis. Bei neuen Datenflüssen, Providern oder Verträgen muss diese Tabelle aktualisiert werden.

### Wiederkehrender Betrieb und Eskalation

Technische Pflege: Astra bzw. beauftragter Engineering-Owner. Produktions-/Account-/Legal-Verantwortliche: Nutzer muss sie vor Launch benennen (USER_ACTION_REQUIRED). Keine erfundenen Betriebszusagen oder automatisch eingerichteten Erinnerungen.

- Wöchentlich: Dependency-/Secret-/Providerwarnungen und AI-Kosten prüfen; kritische Befunde sofort triagieren.
- Monatlich: IAM, aktive Tokens/Integrationen und Dependency-Updates prüfen; keine Secrets in Berichten.
- Vierteljährlich: isolierte Restoreprobe, Threat-Model-Review, AuthZ-/DAST-Negativtests.
- Halbjährlich: Incident-Übung, Retention-/Export-/Löschpfade und Provider-/Privacy-Prüfung.
- Jährlich bzw. vor wesentlichem Release: unabhängige Security-Prüfung organisieren.

Bei bestätigtem Secret: als kompromittiert behandeln; Owner informieren, widerrufen/rotieren und Reichweite prüfen. Entfernen aus Git allein genügt nicht. Bei Datenintegritäts-/Auth-Vorfällen betroffene Writes/Funktionen kontrolliert sperren, Belege ohne Rohdaten sichern, Wiederherstellung isoliert prüfen. Kommunikation/rechtliche Fristen durch verantwortliche Personen beurteilen lassen.

Vor jedem Commit Secret-Precheck mit Gitleaks v8.30.1 (`--redact=100 --ignore-gitleaks-allow`), relevante Tests und Typecheck/Lint. CI prüft erreichbare Historie und exportiertes Web-Bundle; fünf ausschließlich historische Test-Fixtures sind mit exakten Commit/Datei/Regel/Zeilen-Fingerprints ausgenommen. Keine pauschalen Testordner-Ausnahmen. Native signierte Artefakte müssen separat geprüft werden. SAST-/Lizenz-/Remote-Schutzkontrollen bleiben ausdrücklich offen.

19.09.2026 — Native Session-Tokens werden auf der Astra-Review-Branch über OS-SecureStore migriert; ursprüngliche MMKV-/AsyncStorage-Werte werden erst nach bestätigtem Write entfernt. Fehler erzeugen keinen RAM-Fallback und keine Tokenlogs. Logout verhindert Legacy-Resurrection durch einen nicht sensiblen Marker. Rollback benötigt einen kompatiblen Reader. Geräte-/Größen-/Backup-Gates bleiben offen; siehe `docs/release/SECURE_STORAGE_MIGRATION_PLAN.md`. Der aktuelle Audit bestätigt 67 Dependency-Befunde (47 high / 18 moderate / 2 low / 0 critical); keine pauschale Runtime-Entwarnung ohne Expositionsprüfung.

13.09.2026: Medien werden nach bewusster Auswahl/Aufnahme über den bestehenden Server und OpenRouter verarbeitet. Bilder nur als begrenzte data-URLs, keine Serverabrufe beliebiger Bild-URLs; Rohbilder nicht im Chat persistiert. Eigene temporäre Audiodateien werden freigegeben. Literaturabfrage verwendet feste Suchbegriffe ohne Profil-/Gesundheitsdaten. Modellantworten dürfen keine beliebigen Aktionen ausführen: ausschließlich validierte Planstruktur, Vorschau und expliziter lokaler Speicherknopf, Kontogeneration und SQLite-Transaktion.

Client-Providerkey-Pfad entfernt. Keine Provider-/Service-Role-Secrets im Client. EXPO_PUBLIC_ ist öffentlich. Der öffentliche Coach-Handler prüft Supabase-Sessions und begrenzt Requests im Prozess; verteilte Quoten, Deployment-Härtung und reale Auth-Abnahme bleiben vor öffentlicher Freigabe offen. Supabase URL/Anon-Key sind öffentliche Konfiguration, keine Autorisierung.

Native lokale Persistenz verwendet gebundene SQL-Werte, validierte Zeilen/Dokumente, Foreign Keys, Benutzerpartitionen und atomaren Workout-Abschluss. Fehlerdiagnosen des neuen Speichers enthalten nur Speichernamen, keine Fitness-/Gesundheitsdaten. Migration und Backups bleiben lokal. Lokaler Reset berücksichtigt Legacy-Quellen, Backups, Coach und Queue; Account-/Cloud-Daten werden dabei ausdrücklich nicht gelöscht. Kein Tracking neu eingebaut.

Noch offen und releaseblockierend: historische Eigentümerzuordnung und reale Geräte-/RLS-Abnahme der Benutzergrenzen B04, Token-Speicher/Migration, Coach-Auth/Limits B06, serverseitige Transaktionen/RLS-Nachweise, vollständiger Export und Accountlöschung. SQLite ist noch nicht per SQLCipher verschlüsselt; OS-Schutz, Backups und physische Löschung von SQLite-/WAL-Seiten sind auf Geräten zu prüfen. Kein behaupteter DSGVO-/Security-Abschluss.

Aktueller Dependency-Audit nach S1: 57 Befunde (0 critical, 43 high, 14 moderate, 0 low), prod 52. Die ursprünglichen 67 Befunde sind die Eingangsbaseline. tar inzwischen 7.5.21, zusätzlich nanoid/undici korrigiert; Details oben. Weitere Befunde nach realer Build-/Runtime-Exposition bearbeiten, keine pauschale Entwarnung.

Quelle zum tar-Patch: https://github.com/isaacs/node-tar/security/advisories/GHSA-23hp-3jrh-7fpw

EU-Release: Zwecke/Rechtsgrundlagen, Gesundheitsbezug/Art. 9, Datenminimierung, transparente Coach-Übermittlung, Verträge und Drittlandtransfer prüfen. Rechtsquelle: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679

Lokale Accountpartitionen sind jetzt implementiert. UI-Sperre und Generation-Checks schützen gegen alte Pull-/Upload-/Coach-Antworten und Bestätigungsaktionen. Roh-Altbestände bleiben ausschließlich im lokalen Bereich; frühere gemischte Besitzer werden nicht automatisch bereinigt. Der bisherige feste Gastbezeichner bleibt eine offene Migration. Keine automatische Gastdaten-Übernahme mehr beim Login. Das ist keine Verschlüsselungs- oder Backend-RLS-Garantie.
