# EVARO Repository Cleanup Report

**Stand:** 15. September 2026  
**Ziel:** Herbeiführung eines sauberen, wartbaren und stabilen Repository-Zustands für den ersten Beta-Checkpoint (`v0.1.0-beta.1`).

---

## Removed

| Datei / Ordner | Grund | Evidence |
|---|---|---|
| `volt_release_execution_pack/` | Veraltetes Verzeichnis mit altem Branding; vollständig migriert nach `evaro_release_execution_pack/` | `git mv volt_release_execution_pack evaro_release_execution_pack` (Prompt 3) |
| `@opentelemetry/api` in `apps/mobile/package.json` | Ungenutzte Dependency ohne jede Import-Referenz im Monorepo | `git grep "@opentelemetry/api"` lieferte 0 Treffer in Quellcode; Tests nach Entfernung 315/315 PASS (Prompt 2) |

---

## Consolidated

| Alt | Neu | Grund |
|---|---|---|
| `volt_release_execution_pack/*` | `evaro_release_execution_pack/*` | Vereinheitlichung des Ausführungs- und Checklisten-Pakets auf den Markennamen EVARO |
| Sichtbare Volt UI-Strings (`profile.tsx`, `verify.tsx`, `AuthHeader.tsx`, `translations.ts`) | EVARO Bezeichnungen | Brand Harmonization im sichtbaren UI |
| `Volt Coach` Persona & Chips (`api/coach-chat.js`, `CoachComposer.tsx`) | `EVARO Coach` | Brand Harmonization |
| `Volt Verde` / `Volt Ember` (`theme.ts`, `rewards.ts`, `BattlePassModal.tsx`) | `EVARO Verde` / `EVARO Ember` | Sichtbare Colorways umbenannt, interne IDs beibehalten |
| `VOLT Master` / `VOLT SEASON 1: ASCEND` (`level.ts`, `BattlePassModal.tsx`) | `EVARO Master` / `EVARO SEASON 1: ASCEND` | Gamification-Branding normalisiert |
| Name `"Fitness Tracker"` in `apps/mobile/app.json` | `"name": "EVARO"` | App Display Name konsistent |
| OpenRouter Header `'Volt Fitness Tracker'` in `api/coach-chat.js` | `'X-OpenRouter-Title': 'EVARO'` | API Title normalisiert |
| Root `README.md` Verweise auf alte Dokumente | Verweise auf `docs/release/*` | Konsolidierung veralteter Verweise |

---

## Dependencies removed

- `@opentelemetry/api`: Rückstandsfrei aus `apps/mobile/package.json` und `pnpm-lock.yaml` entfernt. Keine funktionalen Einbußen.

---

## Dead code removed

- Keine aggressive Dead-Code-Elimination an Fachlogik oder UI durchgeführt, um Regressionsrisiken für die laufende Beta vollständig auszuschließen.
- Beseitigung von veralteten UI-Hardcodings und ungenutzten Importen im Rahmen der Branding-Updates.

---

## Kept intentionally

- `inspo/`: Enthält Design-Inspirationen, alternative Themes (Arctic, Avionics Brutalism, Titanium Editorial), HTML-Prototypen und Original-Icon-Packs für zukünftiges App-Design (`KEEP_FUTURE_PLAN`).
- `apps/mobile/assets/Design_idea/`: Enthält historische PRDs und Referenz-Screens der ursprünglichen App-Entwicklung (`KEEP_FUTURE_PLAN`).
- `docs/schema.sql`: Vollständiges PostgreSQL-/RLS-Schema für das anstehende Supabase Cloud-Deployment (`KEEP_FUTURE_PLAN`).
- `docs/archive/`: Archivierte Implementierungs- und Statusberichte für historische Nachvollziehbarkeit (`KEEP_REQUIRED`).
- `FITNESS_TRACKER_COMPLETE_WORKFLOW.md`: Umfassende Workflow- und Prompt-Dokumentation für zukünftige Entwicklungsphasen (`KEEP_REQUIRED`).
- `todo.md`: Manuelle Checkliste für Konfigurationen, API-Keys und Store-Schritte (`KEEP_REQUIRED`).
- `.env.example` in `api/` und `apps/mobile/`: Notwendige Vorlagen für Entwicklerumgebungen (`KEEP_REQUIRED`).

---

## Legacy technical identifiers intentionally retained

Folgende technische Identifier wurden ganz bewusst **nicht** umbenannt, da eine Umbenennung ohne aufwendige Migration bestehende Beta-Installationen und Cloud-Verknüpfungen zerstören würde:

| Identifier | Datei | Zweck | Grund der Beibehaltung |
|---|---|---|---|
| `com.fitnesstracker.app` | `apps/mobile/app.json` | iOS Bundle Identifier & Android Package | Verknüpft mit EAS-Profilen und Store-Provisioning |
| `fitness-tracker` | `apps/mobile/app.json`, `authStore.ts` | Expo Slug & URL-Scheme | Deep-Link-Routen für Supabase Magic Links & Passwort-Reset |
| `'volt-sync-store'` | `apps/mobile/src/data/documentDatabase.ts` | SQLite State Document Key | Enthält lokale Sync-Queue bestehender Tester |
| `'volt-coach-store'` | `apps/mobile/src/stores/coachStore.ts` | Zustand SQLite-Persistenz-Key | Speichert bestehende Chat-Verläufe lokaler Beta-Tester |
| `apps/mobile/assets/volt-emblem.png` | `apps/mobile/assets/` | Dashboard-Grafik | Wird erhalten bis offizielles neues EVARO-Vektorlogo vorliegt |
| `VoltDashboard.tsx` / `VoltBackdrop.tsx` | `apps/mobile/src/components/` | Codenamen für Komponenten | Rein interne TypeScript-Symbole ohne UI-Sichtbarkeit |

---

## Uncertain items not removed

- Keine Dateien gelöscht, bei denen Unsicherheit über den zukünftigen Nutzen bestand (Strikte Einhaltung der Grundregel: *Funktionalität und Kontext vor kosmetischer Bereinigung*).

---

## Final validation

- **Typecheck:** PASS (`tsc --noEmit` über alle 3 Monorepo-Pakete – 0 Fehler)
- **Lint:** PASS (`eslint` über alle Pakete – 0 Fehler, 0 Warnungen)
- **Tests:** PASS (**315 / 315 Tests grün**, 0 Fehlgeschlagen, 0 Übersprungen)
- **Coach Check:** PASS (`node api/provider-check.cjs` – Modell und API-Schlüssel bestätigt)
- **Bundle / Start:** PASS (Metro-Konfiguration, Expo Router Einträge und TypeScript-Transpilation syntaktisch intakt)
- **Working Tree:** Sauber
