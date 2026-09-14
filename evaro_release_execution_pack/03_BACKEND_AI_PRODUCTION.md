# WP-03 - Production Backend & AI Coach Hardening

**Ziel:** Den funktionierenden Coach in einen kontrollierten, abrechenbaren und datenschutzbewussten Produktionsdienst verwandeln.

**Warum jetzt:** Der Audit bestätigt ein sinnvolles Backend-Prinzip, aber aktuell kein belastbar abgenommenes Production-Backend und nur prozesslokales Rate Limiting.

**Zeitrahmen:** Woche 2-4 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Backend-Code, Quota-Layer, Entitlement-Schnittstelle, Context Builder, Logging und Tests umsetzen.

**User/extern nötig:** Provider-Accounts/DPAs/Vertragsentscheidungen, Budgetgrenzen und finale Liste freigegebener Modelle.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 03.01 | P0 | M | Production HTTPS Endpoint deployen | Bestehenden /api/coach-chat-Flow auf geeigneter Hosting-Umgebung bereitstellen; Timeouts/Body-Limits/Region prüfen. | Native App kann ausschließlich über HTTPS produktiv auf Coach zugreifen. |
| 03.02 | P0 | M | Serverseitige Auth erzwingen | Jeder Request validiert Supabase Session; keine anonyme Provider-Nutzung. | Ungültige/abgelaufene Tokens führen zu 401/403 ohne Providerkosten. |
| 03.03 | P0 | L | Distributed Rate Limiting | Zentralen Counter via Redis/Upstash oder Postgres/RPC statt process-local Map. | Mehrere Serverinstanzen teilen Limits korrekt. |
| 03.04 | P0 | L | AI Usage Ledger & Budget Guard | Text/Vision/Audio getrennt zählen, geschätzte Kosten persistieren, User-/Tages-/Monats-/Globalbudgets. | Ein einzelner Account kann kein unkontrolliertes Kostenereignis auslösen. |
| 03.05 | P0 | M | Premium Entitlement Gate | Backend prüft aktives EVARO-Pro-Entitlement bevor kostenintensive Premium-AI ausgeführt wird. | Manipuliertes lokales isPremium reicht nicht aus. |
| 03.06 | P0 | M | Provider Policy Lock | Freigegebene Provider/Modelle explizit konfigurieren; Datenschutz-/Retention-Entscheidungen dokumentieren; kein ungeprüftes Random-Routing. | Jeder produktive Modellpfad ist rechtlich/technisch freigegeben. |
| 03.07 | P0 | M | Context Minimization | Pro Query nur notwendige Profile/Workouts/Measurements senden. | Tokenkosten und Datenexposition sind messbar reduziert. |
| 03.08 | P0 | M | Sensitive Logging entfernen | Keine Prompts, Body Measurements, Tokens, Bilder oder komplette Coach-Texte in Standardlogs. | Logs enthalten technische IDs/Latency/Errorcodes ohne sensitive Payload. |
| 03.09 | P0 | S | Remote Kill Switch | Coach serverseitig deaktivierbar ohne App-Update. | Incident kann sofort gestoppt werden. |
| 03.10 | P1 | M | Provider Fallback & Circuit Breaker | Definierter Fallback nur zu freigegebenen Providern; Timeout/Retry begrenzen. | Ausfälle erzeugen kontrollierte UX statt Retry-Sturm. |
| 03.11 | P1 | M | AI Safety Guardrails | Fitness/Wellness Scope, keine Diagnose/Therapie, verletzungsbezogene Eskalation, keine extremen gefährlichen Trainingsratschläge. | Testset mit problematischen Prompts besteht. |

## Empfohlener Ablauf

1. Lies zuerst `00_EXECUTION_RULES_AND_STATUS.md` und den aktuellen `docs/release/EXECUTION_STATUS.md`.
2. Inspiziere die tatsächlich betroffenen Dateien und bestehende Dokumentation, bevor du Änderungen planst.
3. Erstelle einen kurzen Implementierungsplan mit konkreten Dateipfaden und Tests.
4. Bearbeite zuerst P0, dann P1. P2/P3 nur, wenn kein höherer Blocker offen ist.
5. Nach jedem logisch abgeschlossenen Batch: Tests ausführen, Evidence dokumentieren, Status aktualisieren.
6. Wenn Credentials, Store-Konsole, Vertrag/Lizenz oder Rechtsfreigabe nötig ist, erzeuge eine präzise `USER_ACTION_REQUIRED`-Liste statt zu raten.

## Nicht tun

- Kein Full Rewrite des bestehenden Tracker-Cores.
- Keine neue große Produktdomäne einführen.
- Keine Production-Daten löschen oder Migrationen ohne Recovery-Pfad ausrollen.
- Keine sensitiven Daten in Logs/Analytics hinzufügen.
- Keine Aufgabe als abgeschlossen markieren, nur weil Code kompiliert.

## Work-Package Gate

**Coach ist auth-, quota-, entitlement- und cost-gated; keine Secrets im Client; Kill Switch getestet.**

## Handover-Format

```md
### WP-03 Handover
Status: DONE | BLOCKED | READY_FOR_USER
Changes:
- ...
Tests:
- ...
Evidence:
- ...
User action required:
- ...
Residual risks:
- ...
Next recommended work package:
- ...
```
