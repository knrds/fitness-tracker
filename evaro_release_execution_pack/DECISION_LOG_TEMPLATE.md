# Decision Log Template

Nutze diese Datei für irreversible oder geschäftskritische Entscheidungen.

## Offene Entscheidungen aus dem Audit

| Thema | Entscheidung |
| --- | --- |
| Brand | EVARO festgelegt; finaler Display Name im Store; Domain/Support URLs. |
| Publisher identity | Privater Developer-Account vs Organization/Unternehmensauftritt. |
| Freemium | Welche Kernfunktionen bleiben dauerhaft kostenlos? Empfehlung: Tracking, Library, Basis-History/Measurements; Pro: AI, Cloud, Advanced Analytics/Programs. |
| Pricing | Start-Hypothese aus Audit: ca. 9,99 EUR monatlich und 59,99-69,99 EUR jährlich mit 7 Tagen Trial. Vor Anlage im Store final entscheiden. |
| Subscription layer | RevenueCat empfohlen vs komplett eigene StoreKit/Play-Abstraktion. |
| AI provider policy | OpenRouter beibehalten und Provider locken vs direkte Provider-APIs für sensiblere Datenflüsse. |
| Production hosting | Bestehenden Vercel-orientierten Coach-Handler zunächst beibehalten vs später Edge/anderen Runtime-Wechsel. |
| Analytics/Crash vendor | Vendor auswählen unter Datenschutz-/DPA-Anforderungen. |
| Legal review | Kanzlei/Datenschutzexperte für finalen Review benennen. |
| Exercise assets | Falls Provenienz nicht beweisbar: nur Daten ersetzen, Medien ersetzen oder kommerzielle Lizenz erwerben. |

## Template

```md
## DEC-YYYY-MM-DD-XX - Titel
Status: PROPOSED | ACCEPTED | REJECTED | SUPERSEDED
Owner: Konrad Skwarski
Date: YYYY-MM-DD

### Context
Warum ist eine Entscheidung nötig?

### Options
1. ...
2. ...

### Decision
...

### Why
...

### Consequences
- Positiv: ...
- Negativ: ...
- Follow-up: ...

### Evidence / Sources
- ...
```
