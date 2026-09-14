# Master Commercial Launch Checklist

Diese Datei ist die kompakte Sicht auf alle Release-Gates. Die ausführliche Umsetzung steht in den Work Packages.

| # | Prio | Bereich | Gate | Status | Evidence/Link |
| --- | --- | --- | --- | --- | --- |
| 01 | P0 | Native | Echter iOS-Build auf physischem Gerät | [ ] |  |
| 02 | P0 | Native | Echter Android-Build auf physischem Gerät | [ ] |  |
| 03 | P0 | Identity | Bundle ID / Package / Scheme / Brand final | [ ] |  |
| 04 | P0 | Security | Keine Provider-/Service-Secrets im Client oder Git | [ ] |  |
| 05 | P0 | Security | Secure token storage | [ ] |  |
| 06 | P0 | Security | RLS Cross-Account Tests | [ ] |  |
| 07 | P0 | Data | Offline/Online ohne Datenverlust | [ ] |  |
| 08 | P0 | Data | Zwei-Geräte-Konflikte ohne stillen Datenverlust | [ ] |  |
| 09 | P0 | Data | Account löschen löscht Cloud + Auth + lokale Daten | [ ] |  |
| 10 | P0 | Data | Vollständiger Datenexport | [ ] |  |
| 11 | P0 | Backend | Production HTTPS Coach endpoint | [ ] |  |
| 12 | P0 | Backend | Distributed AI rate limits | [ ] |  |
| 13 | P0 | Backend | Global + per-user cost guard | [ ] |  |
| 14 | P0 | Backend | Premium entitlement serverseitig | [ ] |  |
| 15 | P0 | AI | Freigegebene Provider/Modelle dokumentiert | [ ] |  |
| 16 | P0 | AI | AI consent + transparency | [ ] |  |
| 17 | P0 | Licensing | Exercise DB Provenance und Commercial Rights | [ ] |  |
| 18 | P0 | Licensing | Bilder/Anatomie/Fonts/Icons/Sounds Lizenz-BOM | [ ] |  |
| 19 | P0 | Legal | Privacy Policy live | [ ] |  |
| 20 | P0 | Legal | Impressum live | [ ] |  |
| 21 | P0 | Legal | Terms live | [ ] |  |
| 22 | P0 | Legal | Processor/DPA Register | [ ] |  |
| 23 | P0 | Monetization | StoreKit purchase/restore | [ ] |  |
| 24 | P0 | Monetization | Google Billing purchase/restore | [ ] |  |
| 25 | P0 | Monetization | Renewal/cancel/expiry/refund getestet | [ ] |  |
| 26 | P0 | Monitoring | Crash/Error/Sync/AI spend Monitoring | [ ] |  |
| 27 | P0 | Store | Apple Privacy Details / Manifest geprüft | [ ] |  |
| 28 | P0 | Store | Google Data Safety + Health Declaration | [ ] |  |
| 29 | P0 | Store | Reviewer Demo Account | [ ] |  |
| 30 | P0 | QA | Migration von Beta-Daten getestet | [ ] |  |
| 31 | P0 | QA | Release Candidate P0 Device Matrix bestanden | [ ] |  |
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
