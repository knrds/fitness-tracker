# EVARO – RLS Local Test Harness

Stand: 19.09.2026. Risiko CRITICAL. Dieser Ablauf testet echte PostgreSQL-Policies mit synthetischen Daten. Er ist keine Freigabe der produktiven Supabase-Instanz und ersetzt keine GoTrue-/PostgREST-/JWT-Abnahme.

## Geprüfter Stand

- PostgreSQL 17.11 nativ unter Windows, isoliert unter `output/`, nur `127.0.0.1:55432`, SCRAM mit lokal generiertem Zufallspasswort. Kein Systemdienst, kein Docker erforderlich, keine Remote-Verbindung.
- Ursprüngliches `docs/schema.sql`: bidirektionale Basis-CRUD-Tests funktionieren, aber User A kann einen eigenen Template-Eintrag auf eine private Übung von B umstellen. Die Assertion scheitert vor der Migration genau an diesem unerlaubten FK-Verweis.
- Nach `supabase/migrations/202609190001_rls_reference_ownership.sql`: **304 Assertions PASS**; nochmals **304 PASS mit absichtlich zu großzügigen permissiven Policies**. Das sind zwei Szenarien derselben Suite, nicht 608 verschiedene Tests.
- A/B: eigene CRUD-Operationen, fremde CRUD-Operationen, Besitzerwechsel, acht sekundäre FK-Typen jeweils INSERT/UPDATE, PR-Session-/Exercise-Konsistenz, optionale Referenzen und Library-Verweise. Anonymous: CRUD aller elf privaten Tabellen sowie erlaubtes Lesen/unerlaubtes Schreiben des gemeinsamen Übungskatalogs. TRUNCATE-/CREATE-Privilegien und aktiviertes RLS werden geprüft.
- Haupt-Harness läuft in einer Transaktion mit abschließendem ROLLBACK; fehlgeschlagene Assertions stoppen sofort. Zusätzlich prüft der Runner, dass Daten/Helper/Testpolicies verschwunden sind.
- Ein zweites, ausdrücklich `_unsafe_rls_test` genanntes Wegwerf-DB-Szenario enthält absichtlich einen fremden FK-Verweis. Die Migration muss abbrechen und die künstlichen Bestandsdaten unverändert erhalten. Nur diese synthetischen Negativ-Fixtures bleiben in dieser isolierten DB für den Nachweis bestehen.

## Dateien und Ausführung

`scripts/security/rls-bootstrap.sql` erzeugt ausschließlich in einer frischen Testdatenbank `auth.users(id)`, `auth.uid()` und die nicht privilegierten Rollen authenticated/anon. Die Funktion liest gesetzte Testclaims. Sie validiert keine JWTs und implementiert keinen Auth-Server. Breite CRUD-Grants sorgen dafür, dass die SQL-Assertions tatsächlich RLS testen.

`scripts/security/run-rls-tests.sh` verlangt einen bereits gestarteten lokalen PostgreSQL-Server und verfügbare `psql`/`createdb`. PGHOST ist fest Loopback; PGPORT standardmäßig 55432 und PGUSER standardmäßig evaro_test_admin. PGPASSWORD nur lokal als Environment, nie als Kommandoargument oder im Repo. Der Runner erzeugt neue zufällig benannte Datenbanken, überschreibt/löscht keine vorhandenen und führt Baseline, Migration, beide RLS-Szenarien und den negativen Preflight aus.

```bash
bash scripts/security/run-rls-tests.sh
```

Unter Git Bash müssen dessen `/usr/bin` und das portable PostgreSQL-`bin` im PATH liegen. Auf diesem Desktop sind die portablen Binaries in `output/security-tools/postgresql-17.11-3/pgsql/bin`. Serverdaten/Passwort/Logs bleiben ignoriert in `output/`. Nach der Arbeit den eigenen Testserver mit `pg_ctl -D output/rls-postgres-data -m fast -w stop` beenden; kein fremder Prozess wird beendet.

CI verwendet das offizielle PostgreSQL-17.11-Bookworm-Image mit festem Registry-Digest und ausschließlich öffentlichen Wegwerf-Testcredentials. Der gleiche Shell-Runner wurde auf Windows mit Git Bash und echtem PostgreSQL ausgeführt. Die tatsächliche GitHub-Runner-Ausführung und Required-Check-Einstellungen sind separat nachzuweisen.

## Migration / Review / Rollback

Die Migration ist additiv: restrictive Policies ergänzen die bisherigen permissiven Policies. Ownership muss somit auch bei weiteren permissiven Regeln gelten. Tabellenweite TRUNCATE/REFERENCES/TRIGGER- und Schema-CREATE-Rechte für Clientrollen/PUBLIC werden entzogen. RLS wird für alle elf Tabellen aktiviert. Service-/Owner-/BYPASSRLS-Rollen bleiben bewusst außerhalb der RLS-Garantie; ihre Credentials gehören niemals in die App.

Alle Tabellen werden vor dem Bestandscheck gegen konkurrierende Writes gesperrt; fünf Sekunden Lock-Timeout und 60 Sekunden Statement-Timeout. Ungültige vorhandene Verknüpfungen führen zum vollständigen Abbruch. Es gibt keine automatische Löschung, Eigentümer-Neuzuordnung oder History-Reparatur. Abbruch rollt Policy-/Grantänderungen zurück. Nach erfolgreichem Apply wäre Entfernen der Guards eine Wiederöffnung der Lücke; kein automatisches Production-Downgrade.

Vor Remote-Apply: tatsächliche Schema-/Policy-/Grant-/Rollen-Differenzen, PostgreSQL-Version, Bestandsdaten, Sperrzeitfenster, Backup/Restore und API-Integration prüfen. Bestehende Tabellen mit anderen Spalten müssen gesondert migriert werden. Kein Remote-Apply in dieser Session. Supabase-Auth, PostgREST und reale A/B/Anonymous-HTTP-Anfragen bleiben USER_ACTION_REQUIRED / ASTRA_REQUIRED, abhängig von Zugang und Testumgebung.

## Herkunft der lokalen Engine

Offizielle [PostgreSQL-Windows-Seite](https://www.postgresql.org/download/windows/) verweist auf [EDB-Binaryarchive](https://www.enterprisedb.com/download-postgresql-binaries). Verwendet: `postgresql-17.11-3-windows-x64-binaries.zip` vom HTTPS-Host get.enterprisedb.com. Gemessener SHA256: `4b8db0930c38f6ef845db919551dedda3b6b845aeb0927b3d79a6e8e9e4537cf`. Kein separat publizierter Soll-Hash nachgewiesen, postgres.exe ist nicht Authenticode-signiert; der Hash dokumentiert die verwendeten Bytes und ist kein unabhängiger Hersteller-Signaturnachweis. Die Runtime ist ausschließlich lokales Testwerkzeug und keine App-Abhängigkeit.

RLS-Semantik: [PostgreSQL-Dokumentation](https://www.postgresql.org/docs/17/ddl-rowsecurity.html). Aktuelle Ergebnisse/Deployment-Gates: EXECUTION_STATUS.md und P0_READINESS_MATRIX.md.
