# VOLT completion and design pass

Current request: finish the current core, then carry the new visual system through the entire app. Original references in `inspo/` remain unchanged.

## Phase 1 — functional gate
- [x] Read architecture, decisions, known issues, roadmap, agent instructions, legacy workflow and current code/tests.
- [x] Coach: single workout saves only a template; explicit programs retain scheduling; new items appear first without disturbing existing order.
- [x] Coach: one coherent responsive composer with attachments, dictation and send.
- [x] Audit current data export/reset and relevant domain/persistence/navigation gaps. Export now covers plans, exercise preferences, achievements, hydration, caffeine, coach and current workout. Native reset writes roll back together; backup deletion and web KV are separate boundaries.
- [x] Regression tests (251), typecheck, lint, web build and runtime smoke before broad redesign. Composer bounds at 320/1440; all five tabs navigated. Physical native review remains external.

## Phase 2 — visual implementation and review
- [x] Read and visually inspect inspiration.
- [x] Semantic tokens; Glacier default and persistent Amber appearance option.
- [x] Shared controls, navigation and responsive screen shell.
- [x] Home hierarchy and active workout / set logging / rest timer.
- [x] Plans, programs, templates and editors.
- [x] History, progress, charts, achievements and levels.
- [x] Coach conversation, actual training context and plan actions.
- [x] Body, measurements, hydration, anatomy and exercises.
- [x] Profile, grouped settings, appearance and account.
- [x] Auth, modals, empty/error/loading states.
- [x] Host accessibility/layout review: 320/390/1440 widths, reduced motion and both colorways. Physical screenreader/Dynamic Type remain external.
- [x] Final regression checks: 253 tests, typecheck, lint, web export and iOS/Android Hermes exports; documentation and delivery commits on the rebuild branch.

Final browser review: all five tabs; single-workout save creates one template and zero programs; explicit two-week split saves two templates and four scheduled entries; decimal-comma workout and body inputs; caffeine/hydration disclosure; program and template editors; five auth routes; five-point PR chart using isolated QA fixtures; appearance survives reload; normalized exercise search and favorite action without navigation. The template editor's default web input widths and active-program name wrapping were corrected during this review.

## External verification gates
Physical iPhone keyboard, safe areas and native interaction review require the user's device. Browser mobile emulation and iOS/Android exports are reported separately. Deployed HTTPS coach backend and cloud sync verification require infrastructure; no simulated production claims. Future social, marketplace, running and nutrition products are outside this pass.
