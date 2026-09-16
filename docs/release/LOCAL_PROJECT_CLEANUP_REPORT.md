# EVARO – Local Project Cleanup Report

## Pre-Cleanup Safepoint & Starting Point

- **Date:** 16. September 2026
- **PRE_CLEANUP_SAFEPOINT:** `bc6741f`
- **Starting Commit:** `bc6741f` (HEAD -> main, origin/main)
- **Tag:** `v0.1.0-beta.4`
- **Tests Baseline:** 389 passing (60 mobile suites / 314 tests + 57 domain tests + 18 api tests)
- **Coach Check:** PASS (`node api/provider-check.cjs`)
- **Build Baseline:** PASS (`expo export --platform web` in `dist/`, 4.81 MB bundle)

---

## Removed Local Artifacts

| Pfad | Typ | Grund | Git-tracked? |
|---|---|---|---|
| `.playwright-cli/` | Verzeichnis (9 Log-Dateien, 330 KB) | Veraltete lokale Browser-Smoke-Test-Logs (12.–13.09.2026); reine flüchtige Test-Ausgaben | NO (in `.gitignore`) |
| `apps/mobile/dist-native/` | Verzeichnis (20,81 MB) | Generierter nativer Test-Export-Ordner; jederzeit regenerierbar | NO (in `.gitignore`) |
| `apps/mobile/.expo/` | Verzeichnis (~10 KB) | Lokaler Expo Dev-Cache; wird bei `expo start` automatisch regeneriert | NO (in `.gitignore`) |
| `apps/mobile/dist/` | Verzeichnis (19,48 MB) | Web-Build-Export von `pnpm build`; wird durch `pnpm build` in wenigen Sekunden deterministisch regeneriert | NO (in `.gitignore`) |

---

## Removed Repository Files

| Pfad | Grund | Evidence | Risiko |
|---|---|---|---|
| `GEMINI.md` | 0-Byte-Leere Datei im Monorepo-Root; am 01.06.2026 leer eingecheckt (`2cf19af`); besitzt keinerlei Inhalt oder Funktion | Dateigröße 0 Bytes; Antigravity-Projektregeln liegen verbindlich in `AGENTS.md` | LOW |

---

## Consolidated Documentation

| Entfernt/Alt | Ziel/Neu | Grund |
|---|---|---|
| Root `.gitignore` Duplikate (`*.orig.*` und `web-build/`) | Bereinigte, deduplizierte `.gitignore` mit neuen Schutzmustern (`*.tmp`, `*.temp`, `*.bak`, `*.old`) | Beseitigung redundanter Zeilen und Verhinderung versehentlicher Commits temporärer Dateien |
| Unreferenzierte temporäre Artefakte | Zentraler Prüfbericht `docs/release/LOCAL_PROJECT_CLEANUP_REPORT.md` | Vollständige Transparenz und Auditierbarkeit für den nachfolgenden Astra-Agenten |

---

## Removed Code

| Datei | Was entfernt | Warum nachweislich ungenutzt |
|---|---|---|
| *Keine aggressive Code-Löschung* | 0 Zeilen Produktivcode entfernt | Gemäß Vorgabe (*Cleanup, kein Refactoring*) wurde die bestehende Fach- und App-Logik zu 100% erhalten. Potenziell ungenutzte Komponenten wurden analysiert und in die `ASTRA_REVIEW_QUEUE` überführt. |

---

## Removed Dependencies

| Dependency | Evidence für Nichtverwendung |
|---|---|
| *Keine Dependencies eigenmächtig entfernt* | Siehe Abschnitt „Uncertain – not touched“ | Alle 40 aktiven Dependencies in `apps/mobile`, `packages/domain` und `packages/ui` wurden auditiert. Form-Libraries (`react-hook-form`, `@hookform/resolvers`) sind in `CLAUDE.md` und `AGENTS_REFERENCE.md` als Standard deklariert und wurden zur Überprüfung an Astra übergeben (`AR-012`). |

---

## Removed Assets

| Asset | Evidence |
|---|---|
| *Keine Assets entfernt* | Alle Assets in `apps/mobile/assets/` sind entweder direkt eingebunden (`volt-emblem.png`, Ranks 1–10, Icons, Splash) oder in `EXERCISE_ASSET_INVENTORY.md` dokumentiert. Keine vorzeitige Asset-Löschung vor Astras Lizenzentscheidung. |

---

## Intentionally Retained

- **`inspo/` (38 Dateien, 34,05 MB):** Vollständige Design-Inspirationen, alternative Theme-Spezifikationen (Arctic, Avionics, Titanium, Volt Verde/Ember), HTML-Referenzen und Original-Icon-Packs für zukünftige Evolutionsstufen (`KEEP_FUTURE`).
- **`apps/mobile/assets/Design_idea/` (9 Dateien, ~1,5 MB):** Originale PRD-Dokumente und Referenzscreens der ersten Architektur-Phase (`KEEP_FUTURE`).
- **`docs/schema.sql` (20,7 KB):** Kanonisches Cloud-Schema mit RLS-Policies und Tabellen für Supabase (`KEEP_REQUIRED`).
- **`evaro_release_execution_pack/` (17 Dateien, 0,75 MB):** Offizielles Spezifikationspaket WP-01 bis WP-11 inklusive Master-Roadmap und Checklisten (`KEEP_REQUIRED`).
- **`packages/domain/src/data/raw/exercisedb-v1.json` (1,4 MB):** Inaktiver Übungskatalog; bleibt gemäß Regel (*Exercise-Dataset-Austausch ist High-Risk; keine Lizenzprobleme durch Löschen lösen*) unangetastet für Astras Lizenzentscheidung (`AR-009`).
- **`apps/mobile/assets/level-badges.png` (1,4 MB):** Higgsfield-Generiertes Abzeichen-Sprite; bleibt erhalten für Astra-Review bezüglich Nutzungsbedingungen (`EXERCISE_ASSET_INVENTORY.md`).
- **`docs/release/*` (19 Dateien):** Vollständige Release-, Test- und Astra-Vorbereitungsdokumentation (Handoff, Review Queue, Worklog, Specs).
- **`docs/archive/*` (3 Dateien):** Historische Implementierungs-Checklisten und Statusberichte (`KEEP_HISTORY_CRITICAL`).
- **`docs/bug-report.md`, `docs/debugger-queue.md`, `docs/reviews/fix-bugfixes.md`:** Workflow-referenzierte Fehlerprotokolle (`KEEP_HISTORY_CRITICAL`).
- **`docs/gemini-animations-ux-prompt.md`, `docs/gemini-block3-4-prompt.md`, `docs/stitch-block3-prompt.md`:** Historische Referenzprompts, explizit in `AGENTS.md` als Referenz verankert.
- **`FITNESS_TRACKER_COMPLETE_WORKFLOW.md` (79,13 KB):** Master-Workflow-Dokumentation mit detaillierten Architektur-Prompts (`KEEP_REQUIRED`).
- **`todo.md` (10,25 KB):** Manuelle Setup-Checkliste für Keys, Provider und Stores (`KEEP_REQUIRED`).
- **Root-Architektur-Dateien:** `ARCHITECTURE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `ROADMAP.md`, `BACKEND.md`, `DATABASE.md`, `SECURITY.md`, `TESTING.md`, `DEVELOPMENT.md`, `MIGRATION.md`, `FEATURES.md`, `DESIGN.md`, `DESIGN_SYSTEM.md`, `ANDROID_SETUP.md`, `IOS_SETUP.md` (`KEEP_REQUIRED`).
- **`node_modules/`:** Vollständiger, gesunder, verifizierter lokaler Installationsstand.

---

## Uncertain – not touched

- **`apps/mobile/src/components/exercises/ExerciseFilter.tsx`:**
  - *Befund:* Wird im aktuellen Code nirgendwo importiert (`git grep` = 0 Treffer). Wurde am 13.09.2026 mit neuem Design System gestylt.
  - *Entscheidung:* Nicht gelöscht, um keine geplante modale Filterabstraktion zu zerstören. Eingetragen in `ASTRA_REVIEW_QUEUE.md` als `AR-011` mit Empfehlung `VERIFY_DELETE`.
- **`react-hook-form` & `@hookform/resolvers`:**
  - *Befund:* Aktuell in keinem Screen importiert (`useState` dominiert). Aber in `CLAUDE.md` und `AGENTS_REFERENCE.md` als Ziel-Stack deklariert.
  - *Entscheidung:* Beibehalten und als `AR-012` an Astra übergeben, da künftige Screens (z.B. Onboarding WP-06) darauf aufbauen können.

---

## Astra Review

- **AR-009:** Exercise Dataset Replacement (`exercisedb-v1.json` bereinigen oder ersetzen)
- **AR-011:** Potenziell obsolete Komponente `ExerciseFilter.tsx` prüfen und ggf. löschen (`VERIFY_DELETE`)
- **AR-012:** Status von `react-hook-form` und `@hookform/resolvers` entscheiden (`ARCHITECTURE_DECISION`)

---

## Size Before & After

| Metrik | Vorher | Nachher | Delta / Ersparnis |
|---|---|---|---|
| **Lokaler Workspace** (ohne `node_modules`, ohne `.git`) | 97,52 MB | 56,89 MB | **-40,63 MB (-41,7%)** |
| **Git-tracked Dateien** | 405 | 404 | **-1 Datei** (`GEMINI.md` entfernt) |
| **Mobile Assets** | 16,97 MB | 16,97 MB | Unverändert (Sicherheit vor Verfrühtheit) |
| **Inspo Verzeichnis** | 34,05 MB | 34,05 MB | Unverändert (`KEEP_FUTURE`) |
| **Bereinigte Artefakte** | `.playwright-cli`, `dist-native`, `.expo`, `dist` | Alle entfernt / regenerierbar | **40,63 MB Freiraum geschaffen** |

*(Hinweis: Nach erneutem Ausführen von `pnpm build` zur finalen Verifikation wird der optimierte Produktions-Web-Export in `apps/mobile/dist/` neu generiert, bleibt aber über `.gitignore` vom Git-Tracking ausgeschlossen).*

---

## Final Validation

- **Typecheck:** PASS (`tsc --noEmit` über Monorepo – 0 Fehler)
- **Lint:** PASS (`eslint` über Monorepo – 0 Fehler, 0 Warnungen)
- **Tests:** PASS (**389 / 389 Tests grün**, 60 Mobile Suites + Domain + API)
- **Coach Check:** PASS (`node api/provider-check.cjs` – Schlüssel und Modell bestätigt)
- **Build:** PASS (`expo export --platform web` generiert sauberes 4.81 MB Web-Bundle)
- **Git Working Tree:** Sauber; `origin/main` synchronisiert
