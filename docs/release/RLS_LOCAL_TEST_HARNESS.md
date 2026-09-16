# EVARO – RLS Local Test Harness & Execution Guide

**Zielgruppe:** Astra Reviewer  
**Bezug:** Review Item [AR-014](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md)  
**Testskript:** [rls_negative_tests.sql](file:///d:/TrainingsAppGPT/docs/release/rls_negative_tests.sql)  
**Schema-Quelle:** [docs/schema.sql](file:///d:/TrainingsAppGPT/docs/schema.sql)

---

## 1. Zweck des Test-Harness

Gemäß Phase I der Pre-Astra-Vorgaben werden RLS-Policies nicht ungeprüft auf Remote-Instanzen deployed.
Dieses Dokument und das begleitende SQL-Skript ermöglichen Astra, die RLS-Architektur nach lokalem Start der Supabase-Container sofort automatisiert und reproduzierbar auf alle wesentlichen Sicherheitsgrenzen zu testen:

1. **Anonymous Denied:** Unauthentifizierte Clients können keine Benutzer- oder Session-Daten lesen oder einfügen.
2. **User A cannot read User B:** Mandantentrennung bei SELECT auf allen Tabellen (`workout_sessions`, `body_metrics`, custom `exercises`).
3. **User A cannot update User B:** UPDATE-Versuche auf fremde Datensätze modifizieren 0 Zeilen (stilles Leeren ohne Fehler oder Datenkorruption).
4. **User A cannot delete User B:** DELETE-Versuche auf fremde Datensätze löschen 0 Zeilen.
5. **Owner Spoofing Denied:** INSERT mit fremder `user_id` schlägt mit PostgreSQL-Policy-Fehler fehl (`WITH CHECK`-Validierung greift deterministisch).

---

## 2. Voraussetzungen

- Docker Desktop aktiv
- Supabase CLI installiert (`npm install -g supabase` oder via Homebrew / Scoop)

---

## 3. Ausführungsschritte für Astra

### Schritt 1: Lokale Supabase-Instanz starten

```bash
# Im Projektverzeichnis ausführen
supabase init
supabase start
```

### Schritt 2: EVARO Datenbankschema einspielen

```bash
# Schema aus docs/schema.sql anwenden
supabase db execute --file docs/schema.sql
```

### Schritt 3: RLS Negative Tests ausführen

```bash
# Testskript via psql oder Supabase CLI ausführen
supabase db execute --file docs/release/rls_negative_tests.sql
```

Alternativ direkt per `psql`:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f docs/release/rls_negative_tests.sql
```

---

## 4. Erwartetes Testergebnis

| Test # | Beschreibung | Erwartetes Verhalten | Sicherheitsziel |
|---|---|---|---|
| **Test 1** | Anonymous SELECT auf `users` | `0` Zeilen | Kein Datenleck unauthentifizierter Clients |
| **Test 2** | Anonymous SELECT auf `workout_sessions` | `0` Zeilen | Trainingshistorie vor Web-Scraping geschützt |
| **Test 3** | Anonymous INSERT auf `workout_sessions` | `ERROR: new row violates row-level security policy` | Keine fremden Injections ohne Auth-Token |
| **Test 4** | User A SELECT auf User B Session | `0` Zeilen | Strikte Isolation privater Workouts |
| **Test 5** | User A SELECT auf User B Körpermaße | `0` Zeilen | Höchster Datenschutz für Gesundheitsdaten |
| **Test 6** | User A SELECT auf User B Custom Übung | `0` Zeilen | Eigene Übungskreationen bleiben privat |
| **Test 7** | User A UPDATE auf User B Session | `UPDATE 0` (0 Zeilen geändert) | Keine Fremdmanipulation möglich |
| **Test 8** | User A DELETE auf User B Session | `DELETE 0` (0 Zeilen gelöscht) | Fremdes Löschen unmöglich |
| **Test 9** | User A INSERT mit fremder `user_id` (Spoofing) | `ERROR: new row violates row-level security policy` | Token `auth.uid()` zwingend identisch mit `user_id` |
| **Test 10** | User A regulärer INSERT & SELECT eigener Daten | `1 row` erfolgreich persistiert | Regulärer Trainingsbetrieb ungestört |

---

## 5. Astra Review Bestätigung

Sobald diese 10 Tests auf der lokalen Supabase-Instanz fehlerfrei durchlaufen:
- In `docs/release/ASTRA_REVIEW_QUEUE.md` den Punkt `AR-014` auf `APPROVED` setzen.
- Migration `schema.sql` in die offizielle Supabase Migration Pipeline (`supabase/migrations/`) übernehmen.
