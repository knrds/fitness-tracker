# EVARO – Row Level Security (RLS) Deep Audit

**Stand:** 16. September 2026  
**Status:** AUDITED (Static Analysis & Architecture Verification)  
**Dokumentierter Schema-Stand:** `docs/schema.sql`  
**Produktions-Status:** PREPARED – Nicht remote ausgeführt (Astra-Freigabe erforderlich)  
**Astra Review Queue:** [AR-014](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md)

---

## 1. Executive Summary

Die Row Level Security (RLS) Architektur von EVARO schützt die mandantenfähige Datenintegrität auf Datenbankebene. Jede Tabelle in `docs/schema.sql` besitzt ein explizites `alter table ... enable row level security;`.

Es gibt **keine einzige Tabelle im Schema ohne RLS**.

Das Berechtigungskonzept unterscheidet zwei Schichten:
1. **Top-Level Tables (Direkte Bindung an `auth.uid()`):**
   `users`, `workout_templates`, `programs`, `workout_sessions`, `personal_records`, `body_metrics`.
2. **Child Tables (Indirekte Validierung via `EXISTS (...)` über Parent-FK):**
   `template_exercises`, `program_workouts`, `session_exercises`, `exercise_sets`.
3. **Hybrid Table (Katalog + Mandanteneigene Daten):**
   `exercises` (Systemkatalog wenn `owner_id IS NULL`; Custom Exercise wenn `owner_id = auth.uid()`).

---

## 2. Detaillierte RLS-Matrix aller Tabellen

| Tabelle | SELECT | INSERT | UPDATE | DELETE | Owner Column | Policy vorhanden | Negative Test definiert |
|---|---|---|---|---|---|---|---|
| `users` | `id = auth.uid()` | `id = auth.uid()` | `id = auth.uid()` | `id = auth.uid()` | `id` (FK `auth.users`) | YES (4 separate Policies) | YES (Scenario 1-4) |
| `exercises` | `owner_id IS NULL OR owner_id = auth.uid()` | `is_custom AND owner_id = auth.uid()` | `owner_id = auth.uid()` | `owner_id = auth.uid()` | `owner_id` (FK `users.id`) | YES (4 Policies) | YES (Scenario 5-9) |
| `workout_templates` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id` (FK `users.id`) | YES (4 Policies) | YES (Scenario 10-12) |
| `template_exercises` | Parent `workout_templates.user_id = auth.uid()` | Parent `workout_templates.user_id = auth.uid()` | Parent `workout_templates.user_id = auth.uid()` | Parent `workout_templates.user_id = auth.uid()` | Indirect via `template_id` | YES (1 ALL Policy mit USING & WITH CHECK) | YES (Scenario 13-15) |
| `programs` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id` (FK `users.id`) | YES (4 Policies) | YES (Scenario 16-18) |
| `program_workouts` | Parent `programs.user_id = auth.uid()` | Parent `programs.user_id = auth.uid()` | Parent `programs.user_id = auth.uid()` | Parent `programs.user_id = auth.uid()` | Indirect via `program_id` | YES (1 ALL Policy mit USING & WITH CHECK) | YES (Scenario 19-21) |
| `workout_sessions` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id` (FK `users.id`) | YES (4 Policies) | YES (Scenario 22-25) |
| `session_exercises` | Parent `workout_sessions.user_id = auth.uid()` | Parent `workout_sessions.user_id = auth.uid()` | Parent `workout_sessions.user_id = auth.uid()` | Parent `workout_sessions.user_id = auth.uid()` | Indirect via `session_id` | YES (1 ALL Policy mit USING & WITH CHECK) | YES (Scenario 26-28) |
| `exercise_sets` | Join `session_exercises -> workout_sessions.user_id = auth.uid()` | Join `session_exercises -> workout_sessions.user_id = auth.uid()` | Join `session_exercises -> workout_sessions.user_id = auth.uid()` | Join `session_exercises -> workout_sessions.user_id = auth.uid()` | Indirect via `session_exercise_id` | YES (1 ALL Policy mit USING & WITH CHECK) | YES (Scenario 29-32) |
| `personal_records` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id` (FK `users.id`) | YES (4 Policies) | YES (Scenario 33-35) |
| `body_metrics` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id` (FK `users.id`) | YES (4 Policies) | YES (Scenario 36-38) |

---

## 3. Sicherheitsanalyse & Erkenntnisse für Astra

### 3.1 Kann User A Daten von User B lesen?
- **Nein**, für alle Nutzerdaten (`users`, `workout_templates`, `programs`, `workout_sessions`, `personal_records`, `body_metrics`, `session_exercises`, `exercise_sets`).
- Bei `exercises` kann User A **nur** den allgemeinen Katalog (`owner_id IS NULL`) und die eigenen Custom Exercises lesen. Custom Exercises von User B sind strikt unsichtbar.

### 3.2 Kann User A Daten von User B verändern oder löschen?
- **Nein**. Alle `UPDATE`- und `DELETE`-Policies erzwingen `USING (user_id = auth.uid())` bzw. den `EXISTS`-Check gegen die Eltern-Tabelle. Wenn User A versucht, einen Datensatz von User B per Primärschlüssel zu adressieren (`UPDATE workout_sessions SET ... WHERE id = 'user-b-session'`), matcht die `USING`-Klausel 0 Zeilen (PostgreSQL verhält sich wie bei nicht existierender ID).

### 3.3 Kann User A fremde Daten unterschieben (Owner Spoofing bei INSERT)?
- **Nein**. Alle `INSERT`-Policies enthalten `WITH CHECK (user_id = auth.uid())` bzw. `WITH CHECK (id = auth.uid())`. 
- Ein Versuch wie `INSERT INTO workout_sessions (user_id, ...) VALUES ('user-b-id', ...)` wirft sofort einen PostgreSQL RLS-Verletzungsfehler (`new row violates row-level security policy`).

### 3.4 Identifizierte feine Grenzfälle (Astra-Aufmerksamkeit gefordert)

1. **Cross-Tenant Foreign Key Referenzen in Child-Tabellen:**
   - In `template_exercises` wird `exercise_id` referenziert. Die Policy prüft, dass das Template User A gehört. Sie prüft jedoch nicht explizit, ob `exercise_id` dem User A gehört oder Systemkatalog ist. 
   - *Auswirkung:* Sollte User A die UUID einer Custom Exercise von User B erraten, könnte User A diese in seinem Template verlinken. User A könnte die Details der Exercise in `exercises` zwar weiterhin nicht lesen, aber die Referenz existiert.
   - *Empfehlung für Astra:* Optionalen Constraint oder Trigger hinzufügen:
     `CHECK (exercise_id IN (SELECT id FROM exercises WHERE owner_id IS NULL OR owner_id = auth.uid()))` oder dies im API-Layer validieren.

2. **Cross-Tenant Template-Referenz in `program_workouts`:**
   - In `program_workouts` gehört `program_id` nachweislich User A. Aber `template_id` wird nicht gegen `workout_templates.user_id = auth.uid()` geprüft.
   - *Empfehlung für Astra:* `WITH CHECK (EXISTS (SELECT 1 FROM workout_templates wt WHERE wt.id = template_id AND wt.user_id = auth.uid()))` ergänzen.

3. **Anonymous Access auf `exercises`:**
   - `exercises_select` erlaubt `owner_id IS NULL OR owner_id = auth.uid()`.
   - Bei unauthentifizierten Requests (`auth.uid() IS NULL`) evaluiert `owner_id IS NULL` zu `TRUE`. Unauthentifizierte Clients können somit den öffentlichen Übungskatalog lesen.
   - *Bewertung:* Für Onboarding/Vorschau vorteilhaft, aber falls der Katalog vor Scraping geschützt werden soll, muss Astra `auth.role() = 'authenticated'` vorschalten.

4. **Fehlende Cloud RPCs in `schema.sql`:**
   - Die in `ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md` geforderte Stored Procedure `delete_user_account()` ist in `docs/schema.sql` noch nicht enthalten.
   - Muss vor Go-Live als privilegierte Funktion (`SECURITY DEFINER`) in Supabase migriert werden.

5. **Storage Buckets:**
   - Keine Storage-Bucket-Policies in `docs/schema.sql` (z. B. für Profilbilder oder Video-Uploads). Storage läuft derzeit rein lokal.
