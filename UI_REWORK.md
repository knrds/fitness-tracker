# VOLT visual rework

## Functional baseline — 13 September 2026
Coach composer rebuilt as one input surface. A single workout saves only its template; explicit programs support a repeated weekly schedule of 1–104 weeks. Older messages without a kind resolve one day as a template, multiple days as a program. Existing saved programs are preserved. New manual and Coach entries prepend without re-sorting existing entries.

Export schema 2 retains the original fields and adds programs/templates, exercise preferences, progression, hydration/caffeine, Coach messages and the current workout. No authentication/session credentials or provider keys are exported. This is a JSON data export; no restore/import feature is claimed.

Native local reset now groups store writes in a SQLite transaction and restores memory on failure. Deletion of recovery backups occurs before this transaction and is not rolled back. Web key-value writes still do not offer a cross-document disk transaction.

Validation: 57 domain + 181 mobile + 13 API tests; typecheck/lint/web export; 320/1440 px composer bounds and five-tab browser navigation. Physical iPhone verification and a deployed HTTPS Coach endpoint remain external gates.

## Design direction
References: original `inspo/DESIGN.md`, Home, History and Coach screenshots. Their palette, geometric headings and deliberate use of accents are useful; their fabricated telemetry, density, small type and ubiquitous glow are not copied. Mobile strength logging stays the highest priority. Existing Space Grotesk and Manrope fonts provide geometric headings and readable conversation without extra font-loading risk.

## Before / after review
| Area | Before | Implemented |
| --- | --- | --- |
| Coach input | Detached media toolbar, long hint between controls, separate send | One bounded surface, text above aligned media and send controls, expandable privacy hint |
| Coach plans | Every plan creates a program | Single workout template; explicit split/weekly program with a clear preview |
| Lists | New plans appended | New entries first; existing order preserved |

Further visual implementation and verification are tracked in `IMPLEMENTATION_CHECKLIST.md`.

## Shared visual system and screen migration

Semantic Glacier/Amber themes now cover controls, navigation, screens, charts, anatomy, hydration, auth and modal surfaces. Profile appearance persists; a real SQLite regression restores Amber while preserving existing profile fields. `DESIGN.md` describes the central configuration and exceptions for physical plate/water colors.

| Area | Before | Implemented |
| --- | --- | --- |
| Appearance | Screen-local colors and inconsistent neutral surfaces | Shared semantic colors and persistent Glacier/Amber selection |
| Navigation | Uneven Home geometry and instant local selections | Consistent targets, VOLT flash, animated icon emphasis and sliding segmented selection |
| Home | Full-width generic card/list hierarchy | Clipped VOLT light motif, actual weekly training days, responsive hero/week pairing |
| Workout | Four cramped numeric columns at 320 px | Weight/reps first, separate RPE/RIR row, current-set emphasis, fixed header |
| Secondary controls | Large always-visible caffeine/hydration toolbars | Measured animated disclosure and clear primary actions |
| Programs | Narrow names beside activation; floating creation covers actions | Full-width titles with actions below; in-flow creation and lighter schedule rows |
| Progress | Mixed chart/status palettes and low-contrast locked items | Semantic chart colors, readable locked states, themed XP/rank surface |
| Body | Inconsistent colors and small white exercise cards | Unified dark inputs/cards, illuminated anatomy, theme-aware glass/water |
| Profile/auth | Long undifferentiated settings and mixed form geometry | Grouped settings, appearance selection, bounded auth forms and safe-area spacing |

Browser review covers all five main tabs at 390/1440, workout and summary at 320, expanded timer, active program/editor, and measurement modal. The last verified core check run passed 252 tests, typecheck and lint. Final detail QA and exports remain tracked separately until finished.

## Final detail review

The real Coach follow-up exposed a missing German `Wochenprogramm`/`Split` creation intent. The server now recognizes these requests and invokes its validated structured-plan path; a regression covers German/English program creation and excludes informational questions. Real provider results: one standalone workout saved one template and no program; the explicit two-week/two-day split saved two templates plus one program with four scheduled entries. No fake API response was used.

At 320 px the template editor's native web-input minimum widths overflowed its card. Explicit shrink bounds, readable numeric fields and a separate full-width exercise title fix this. Exercise favorite presses no longer bubble into detail navigation. Body charts now respond to viewport changes and fit the narrow card. Achievements include completion dates and readable unearned repeatable states. Auth footers retain spacing when wrapping.

Visual artifacts are in the task's `outputs/screenshots` directory. Synthetic chart sessions exist only in the isolated Playwright browser profile, not in source/default app data. Physical keyboard, touch performance, native screenreader and Dynamic Type verification remain device gates; iOS/Android Hermes exports are not device builds.

Final checks: 57 domain + 182 mobile + 14 API tests passed; typecheck and lint passed; web, iOS and Android exports completed. The final 320 px editor/search smoke passed after correcting input shrink bounds. Reduced-motion auth/navigation review covered all five auth routes. No new dependencies were introduced by this UI pass.

## Gemini baseline follow-up — 2026-09-14

Continued from Gemini baseline d461afd on fix/workout-swipe-polish. Existing themes, exercise media, ghost values, PR feedback and Coach behavior are preserved. Scope was limited at the user's request to conserve remaining credits and publish the current work.

| Area | Before | Current behavior |
| --- | --- | --- |
| Set swipe | Red behind the entire translucent row; unbounded swipe and automatic deletion | Opaque foreground, bounded 88 px trailing action, explicit deletion, cancellation and hidden-action accessibility handling |
| Navigation | Uneven icon/label sizing and narrow targets | Consistent icons, readable labels, full-width targets, safe-area spacing and restrained reduced-motion-aware feedback |
| Workout clock | Parent session rerendered every second | Timer updates isolated in a small component with a pause/render regression test |
| Achievements | Dismiss button below scrolling content | Stable footer action with an accessible label |
| Validation | Twelve baseline lint errors | Unused imports and audio/swipe types cleaned up; lint passes |

Validation: 57 domain + 188 mobile + 15 API tests passed (260 total). Final typecheck and lint passed; web export passed. iOS/Android Hermes exports passed before the last small navigation sizing and header accessibility adjustments; exports are not device builds. Real browser touch dispatch verified closed/partial/open swipe, completed rows, long swipes without automatic deletion, closing, cancellation, vertical scrolling and deletion through the details action at narrow widths. The 320 px navigation screenshot was inspected. The complete theme/viewport navigation matrix remains unfinished: the browser session was no longer available on resumption. Physical iPhone/Android, VoiceOver and Dynamic Type remain device gates. No new dependencies.
