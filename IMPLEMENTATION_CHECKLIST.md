# VOLT completion and design pass

Current request: finish the current core, then carry the new visual system through the entire app. Original references in `inspo/` remain unchanged.

## Phase 1 — functional gate
- [x] Read architecture, decisions, known issues, roadmap, agent instructions, legacy workflow and current code/tests.
- [x] Coach: single workout saves only a template; explicit programs retain scheduling; new items appear first without disturbing existing order.
- [x] Coach: one coherent responsive composer with attachments, dictation and send.
- [x] Audit current data export/reset and relevant domain/persistence/navigation gaps. Export now covers plans, exercise preferences, achievements, hydration, caffeine, coach and current workout. Native reset writes roll back together; backup deletion and web KV are separate boundaries.
- [x] Regression tests (251), typecheck, lint, web build and runtime smoke before broad redesign. Composer bounds at 320/1440; all five tabs navigated. Physical native review remains external.

## Phase 2 — visual implementation and review
- [ ] Read and visually inspect inspiration.
- [ ] Semantic tokens; Glacier default and persistent Amber appearance option.
- [ ] Shared controls, navigation and responsive screen shell.
- [ ] Home hierarchy and active workout / set logging / rest timer.
- [ ] Plans, programs, templates and editors.
- [ ] History, progress, charts, achievements and levels.
- [ ] Coach conversation, actual training context and plan actions.
- [ ] Body, measurements, hydration, anatomy and exercises.
- [ ] Profile, grouped settings, appearance and account.
- [ ] Auth, modals, empty/error/loading states.
- [ ] Cross-screen accessibility, narrow widths, reduced motion and both colorways.
- [ ] Full regression checks, final documentation, commits and push to rebuild branch.

## External verification gates
Physical iPhone keyboard, safe areas and native interaction review require the user's device. Browser mobile emulation and iOS/Android exports are reported separately. Deployed HTTPS coach backend and cloud sync verification require infrastructure; no simulated production claims. Future social, marketplace, running and nutrition products are outside this pass.
