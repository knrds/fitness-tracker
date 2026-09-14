# Master Commercial Launch Checklist

Diese Datei ist die kompakte Sicht auf alle Release-Gates. Die ausführliche Umsetzung steht in den Work Packages.

| # | Prio | Bereich | Gate | Status | Evidence/Link |
| --- | --- | --- | --- | --- | --- |
| 01 | P0 | Native | Echter iOS-Build auf physischem Gerät | NOT_STARTED | `docs/release/EXECUTION_STATUS.md#3-master_checklist--status-aller-p0-gates` |
| 02 | P0 | Native | Echter Android-Build auf physischem Gerät | NOT_STARTED | `docs/release/EXECUTION_STATUS.md#3-master_checklist--status-aller-p0-gates` |
| 03 | P0 | Identity | Bundle ID / Package / Scheme / Brand final | PARTIAL | `docs/release/ASTRA_HANDOFF.md#branding--identifier-migration` |
| 04 | P0 | Security | Keine Provider-/Service-Secrets im Client oder Git | DONE | Keine Secrets in `apps/mobile`, `.env.coach.local` in `.gitignore` |
| 05 | P0 | Security | Secure token storage | PARTIAL | `supabase-auth-storage` in Plain MMKV; Keychain/Keystore ausstehend |
| 06 | P0 | Security | RLS Cross-Account Tests | PARTIAL | RLS-Policies in `docs/schema.sql`; Cross-Account-Negativtests ausstehend |
| 07 | P0 | Data | Offline/Online ohne Datenverlust | PARTIAL | SQLite Schema 2 mit Outbox offline grün (240 Tests PASS); Cloud-Sync ungetestet |
| 08 | P0 | Data | Zwei-Geräte-Konflikte ohne stillen Datenverlust | NOT_STARTED | `docs/release/EXECUTION_STATUS.md#3-master_checklist--status-aller-p0-gates` |
| 09 | P0 | Data | Account löschen löscht Cloud + Auth + lokale Daten | PARTIAL | Lokaler Reset vorhanden; Cloud Delete gemappt in `docs/release/ACCOUNT_DATA_MAP.md` |
| 10 | P0 | Data | Vollständiger Datenexport | DONE | `apps/mobile/src/stores/profileStore.ts:exportData` (JSON maschinenlesbar) |
| 11 | P0 | Backend | Production HTTPS Coach endpoint | NOT_STARTED | Coach aktuell nur Loopback `127.0.0.1:8096` |
| 12 | P0 | Backend | Distributed AI rate limits | NOT_STARTED | Nur In-Memory Limiter in `api/coach-chat.js` |
| 13 | P0 | Backend | Global + per-user cost guard | PARTIAL | 6 Req/Tag Prototype-Limit vorhanden, Provider-Hard-Cap ausstehend |
| 14 | P0 | Backend | Premium entitlement serverseitig | NOT_STARTED | Gemappt in `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md` |
| 15 | P0 | AI | Freigegebene Provider/Modelle dokumentiert | DONE | `.env.coach.local` (Whisper, DeepSeek, GPT-5.6, Gemini) |
| 16 | P0 | AI | AI consent + transparency | PARTIAL | Disclaimer in `profile.tsx`; Vorab-Einwilligung ausstehend |
| 17 | P0 | Licensing | Exercise DB Provenance und Commercial Rights | BLOCKED | `docs/release/EXERCISE_ASSET_INVENTORY.md` (Commercial rights not verified) |
| 18 | P0 | Licensing | Bilder/Anatomie/Fonts/Icons/Sounds Lizenz-BOM | PARTIAL | `docs/release/EXERCISE_ASSET_INVENTORY.md`, `docs/release/AUDIO_HAPTICS_AUDIT.md` |
| 19 | P0 | Legal | Privacy Policy live | NOT_STARTED | UI-Platzhalter in `profile.tsx` vorbereitet; externe URL ausstehend |
| 20 | P0 | Legal | Impressum live | NOT_STARTED | UI-Platzhalter in `profile.tsx` vorbereitet; § 5 DDG Inhalt ausstehend |
| 21 | P0 | Legal | Terms live | NOT_STARTED | UI-Platzhalter in `profile.tsx` vorbereitet; EULA/AGB ausstehend |
| 22 | P0 | Legal | Processor/DPA Register | NOT_STARTED | AVV für Supabase und OpenRouter ausstehend |
| 23 | P0 | Monetization | StoreKit purchase/restore | NOT_STARTED | Gemappt in `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md` |
| 24 | P0 | Monetization | Google Billing purchase/restore | NOT_STARTED | Gemappt in `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md` |
| 25 | P0 | Monetization | Renewal/cancel/expiry/refund getestet | NOT_STARTED | `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md` |
| 26 | P0 | Monitoring | Crash/Error/Sync/AI spend Monitoring | NOT_STARTED | Sentry/Monitoring noch nicht integriert |
| 27 | P0 | Store | Apple Privacy Details / Manifest geprüft | NOT_STARTED | `PrivacyInfo.xcprivacy` Manifest noch nicht angelegt |
| 28 | P0 | Store | Google Data Safety + Health Declaration | NOT_STARTED | Deklaration ausstehend |
| 29 | P0 | Store | Reviewer Demo Account | NOT_STARTED | Demo-Zugang mit Daten ausstehend |
| 30 | P0 | QA | Migration von Beta-Daten getestet | PARTIAL | SQLite v1->v2 Migration unit-getestet (`documentDatabase.test.ts`) |
| 31 | P0 | QA | Release Candidate P0 Device Matrix bestanden | NOT_STARTED | Physische Testmatrix ausstehend |
| 32 | P1 | UX | Onboarding + personalized result + fair paywall | [ ] |  |
| 33 | P1 | UX | Empty/Error/Offline States | [ ] |  |
| 34 | P1 | Native Feel | Push Preferences + local reminders | [ ] |  |
| 35 | P1 | Native Feel | Haptic Service + Settings | [ ] |  |
| 36 | P1 | Native Feel | Audio Service + Settings | [ ] |  |
| 37 | P1 | Accessibility | VoiceOver/TalkBack/Large Text | [ ] |  |
| 38 | P1 | Analytics | Event taxonomy ohne Health payloads | [ ] |  |
| 39 | P1 | Operations | Remote config / kill switches | [ ] |  |
| 40 | P1 | Support | Support/FAQ/feedback path | [ ] |  |

## Go-Live-Regel

Ein P0 darf vor Store Submission nur dann offen bleiben, wenn es objektiv **nicht** auf diese App zutrifft und diese Entscheidung im Decision Log begründet wurde. "Später fixen" ist für P0 kein akzeptabler Status.
