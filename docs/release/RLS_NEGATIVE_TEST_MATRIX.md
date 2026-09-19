# EVARO – RLS Negative Test Matrix & Harness Specification

Aktuelle Abnahme 19.09.2026: 304 echte PostgreSQL-Assertions implementieren und erweitern diese frühere Spezifikation; A/B/Anonymous CRUD aller elf Tabellen, fremde sekundäre FKs, Shared Library, PR-Verknüpfungen, Grants, adversarial permissive Policies und Rollback. Laufbefehle/Grenzen in RLS_LOCAL_TEST_HARNESS.md. Keine Remote-Supabase-/JWT-Abnahme behauptet.

**Stand:** 16. September 2026  
**Dokumentierter Stand:** `docs/schema.sql`  
**Zweck:** Deterministischer Testplan zur Absicherung gegen Cross-Tenant Data Leaks, Privilegieneskalation und unauthorisierte Zugriffe auf Supabase-Ebene.

---

## 1. Test-Szenarien Übersicht

Jedes Szenario definiert die Ausgangslage (Context), die ausgeführte Operation, das exakt erwartete Ergebnis sowie den Sicherheitsgrund.

| ID | Szenario | Akteur | Zielobjekt | Operation | Erwartetes Ergebnis | Sicherheitsbegründung |
|---|---|---|---|---|---|---|
| **RLS-NEG-01** | Cross-Tenant Read User Profile | User A | `users` (User B) | `SELECT * FROM users WHERE id = 'user-b'` | 0 Zeilen zurückgegeben (Empty Set) | `users_select_own` prüft `id = auth.uid()` |
| **RLS-NEG-02** | Cross-Tenant Read Workout Session | User A | `workout_sessions` (User B) | `SELECT * FROM workout_sessions WHERE id = 'session-b'` | 0 Zeilen zurückgegeben | `sessions_select_own` filtert strikt auf `user_id = auth.uid()` |
| **RLS-NEG-03** | Cross-Tenant Read Exercise Sets | User A | `exercise_sets` (User B) | `SELECT * FROM exercise_sets WHERE id = 'set-b'` | 0 Zeilen zurückgegeben | `exercise_sets_all_own` Join über `session_exercises -> workout_sessions` liefert 0 Treffer |
| **RLS-NEG-04** | Cross-Tenant Read Custom Exercise | User A | `exercises` (Custom User B) | `SELECT * FROM exercises WHERE id = 'custom-ex-b'` | 0 Zeilen zurückgegeben | `exercises_select` erlaubt nur eigene (`owner_id = auth.uid()`) oder Library (`owner_id IS NULL`) |
| **RLS-NEG-05** | Cross-Tenant Read Body Metrics | User A | `body_metrics` (User B) | `SELECT * FROM body_metrics WHERE id = 'metric-b'` | 0 Zeilen zurückgegeben | `body_metrics_select_own` filtert auf `user_id = auth.uid()` |
| **RLS-NEG-06** | Cross-Tenant Update Session | User A | `workout_sessions` (User B) | `UPDATE workout_sessions SET name = 'Hacked' WHERE id = 'session-b'` | 0 Zeilen aktualisiert (No Error, No-op) | `USING (user_id = auth.uid())` schließt fremde Zeilen vor Ausführung aus |
| **RLS-NEG-07** | Cross-Tenant Update Exercise Set | User A | `exercise_sets` (User B) | `UPDATE exercise_sets SET weight = 999 WHERE id = 'set-b'` | 0 Zeilen aktualisiert | `USING` Klausel findet keinen Pfad zu User A |
| **RLS-NEG-08** | Cross-Tenant Delete Program | User A | `programs` (User B) | `DELETE FROM programs WHERE id = 'prog-b'` | 0 Zeilen gelöscht | `programs_delete_own` verhindert Löschen fremder Programme |
| **RLS-NEG-09** | Cross-Tenant Delete Personal Record | User A | `personal_records` (User B) | `DELETE FROM personal_records WHERE id = 'pr-b'` | 0 Zeilen gelöscht | `prs_delete_own` isoliert PRs |
| **RLS-NEG-10** | Owner Spoofing INSERT | User A | `workout_sessions` | `INSERT INTO workout_sessions (user_id, ...) VALUES ('user-b', ...)` | PostgreSQL RLS Error (violates policy `sessions_insert_own`) | `WITH CHECK (user_id = auth.uid())` schlägt fehl (`user-a != user-b`) |
| **RLS-NEG-11** | Owner Spoofing Custom Exercise | User A | `exercises` | `INSERT INTO exercises (owner_id, is_custom, ...) VALUES ('user-b', true, ...)` | PostgreSQL RLS Error (violates policy `exercises_insert_own`) | `WITH CHECK (is_custom AND owner_id = auth.uid())` schlägt fehl |
| **RLS-NEG-12** | Child Row Injection (Template Exercise) | User A | `template_exercises` | `INSERT INTO template_exercises (template_id, ...) VALUES ('template-b', ...)` | PostgreSQL RLS Error (violates policy `template_exercises_all_own`) | `WITH CHECK (EXISTS (SELECT 1 FROM workout_templates t WHERE t.id = template_id AND t.user_id = auth.uid()))` schlägt fehl |
| **RLS-NEG-13** | Child Row Injection (Exercise Set) | User A | `exercise_sets` | `INSERT INTO exercise_sets (session_exercise_id, ...) VALUES ('session-ex-b', ...)` | PostgreSQL RLS Error (violates policy `exercise_sets_all_own`) | Multi-Hop Parent Check schlägt fehl |
| **RLS-NEG-14** | Anonymous Read Protected Table | Anon (`auth.uid() IS NULL`) | `workout_sessions` | `SELECT * FROM workout_sessions` | 0 Zeilen zurückgegeben | `NULL = NULL` evaluiert in SQL zu NULL/False |
| **RLS-NEG-15** | Anonymous Insert Attempt | Anon (`auth.uid() IS NULL`) | `body_metrics` | `INSERT INTO body_metrics (user_id, weight_kg) VALUES ('some-uuid', 75)` | PostgreSQL RLS Error | `WITH CHECK (user_id = auth.uid())` evaluiert zu `user_id = NULL` -> False |
| **RLS-NEG-16** | Expired JWT Request | User A (Expired) | `workout_templates` | `SELECT * FROM workout_templates` | HTTP 401 Unauthorized vor DB-Ebene | Supabase GoTrue Auth Gateway blockiert Token vor Postgres-Query |
| **RLS-NEG-17** | Tampered JWT (Wrong UID in claims) | User A (Manipulated) | `workout_sessions` | `SELECT * FROM workout_sessions` | HTTP 401 Unauthorized / Signature Invalid | JWT Signaturprüfung im Auth-Gateway schlägt fehl |
| **RLS-NEG-18** | Account Switch Isolation | User A -> User B | Local Cache / Memory | Re-read `workout_sessions` nach Relogin als User B | Ausschließlich User B Daten sichtbar | Session Cache Flush bei Logout stellt saubere Trennung sicher |
| **RLS-NEG-19** | Deleted Account Access | User A (Gelöscht) | Supabase DB | `SELECT * FROM users WHERE id = 'deleted-user'` | HTTP 401 / 0 Zeilen | FK `on delete cascade` hat alle Datensätze des Nutzers entfernt |
| **RLS-NEG-20** | Re-assign Existing Row to Another User | User A | `workout_sessions` | `UPDATE workout_sessions SET user_id = 'user-b' WHERE id = 'session-a'` | PostgreSQL RLS Error (violates policy `sessions_update_own`) | `WITH CHECK (user_id = auth.uid())` blockiert Eigentümer-Transfer |

---

## 2. Automatisierbares Test-Script für Astra (Supabase CLI Harness)

Sobald Astra eine lokale Supabase-Testinstanz (`supabase start`) startet, kann dieser Testlauf automatisiert mit zwei Test-Tokens ausgeführt werden:

```typescript
// tests/supabase/rls-negative.test.ts (Vorbereitung für Astra)
import { createClient } from '@supabase/supabase-js';

describe('Supabase RLS Negative Isolation Tests', () => {
  const userA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const userB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  beforeAll(async () => {
    // Authenticate test accounts
    // userA: test-user-a@evaro.app
    // userB: test-user-b@evaro.app
  });

  test('RLS-NEG-01: User A cannot read User B profile', async () => {
    const { data } = await userA.from('users').select('*').eq('id', userBId);
    expect(data).toHaveLength(0);
  });

  test('RLS-NEG-02: User A cannot read User B workout session', async () => {
    const { data } = await userA.from('workout_sessions').select('*').eq('id', userBSessionId);
    expect(data).toHaveLength(0);
  });

  test('RLS-NEG-06: User A cannot update User B workout session', async () => {
    const { count } = await userA.from('workout_sessions').update({ name: 'Hacked' }).eq('id', userBSessionId);
    expect(count).toBe(0);
  });

  test('RLS-NEG-10: User A cannot insert session owned by User B', async () => {
    const { error } = await userA.from('workout_sessions').insert({
      user_id: userBId,
      name: 'Spoofed Session',
      started_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501'); // Postgres RLS violation code
  });
});
```

---

## 3. Review-Hinweise für Astra

1. **Kein Mock-Test für Production:** Diese Negative Tests müssen vor Produktivfreigabe gegen eine echte PostgreSQL-Instanz (Supabase Local Docker oder Staging) verifiziert werden.
2. **Postgres Error 42501:** Bestätigt, dass die RLS-Policy auf Serverebene greift und nicht erst durch Client-Filterung verworfen wird.
3. **Storage RLS:** Sobald ein Storage Bucket für Medien hinzukommt, müssen analoge Negative Tests für `storage.objects` definiert werden (`storage.foldername(name)[1] = auth.uid()::text`).
