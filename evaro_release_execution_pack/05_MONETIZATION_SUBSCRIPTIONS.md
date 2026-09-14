# WP-05 - Subscriptions, Revenue & Entitlements

**Ziel:** Native Abos korrekt, wiederherstellbar und serverseitig vertrauenswürdig implementieren.

**Warum jetzt:** Für digitale Premium-Funktionen sind auf iOS StoreKit/IAP und auf Android grundsätzlich Play Billing der risikoärmste V1-Weg. Stripe gehört nicht als primärer In-App-Payment-Flow in diese V1.

**Zeitrahmen:** Woche 3-5 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** SDK-/Entitlement-Code, Paywall-Backend-Hooks, Testharness, Webhook-Handler und Feature-Gating implementieren.

**User/extern nötig:** Store Agreements, Banking/Tax, Preisentscheidung, RevenueCat Account/Keys, Apple/Google Product Setup.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 05.01 | P0 | S | Produktmodell festlegen | Free vs EVARO Pro finalisieren; Export/Delete/Privacy niemals paywallen. | Eine eindeutige Feature-Matrix existiert. |
| 05.02 | P0 | S | Produkte definieren | Monat und Jahr, Trial, Product IDs, Länder/Preise und Intro Eligibility. | Store-Produkte in App Store Connect/Play Console angelegt. |
| 05.03 | P0 | M | RevenueCat oder äquivalente Abstraktion integrieren | Entitlement evaro_pro (bzw. volt_pro Mapping); Apple/Google Produkte mappen; keine geheimen Serverkeys im Client. | Purchase-/Restore-Flows funktionieren in Sandbox/Test. |
| 05.04 | P0 | M | Serverseitige Entitlements spiegeln | Webhook -> Backend/Supabase; Status, Expiry, Product, Platform, Original Transaction/User Mapping. | Coach und Premium-API vertrauen serverseitigem Entitlement. |
| 05.05 | P0 | M | Subscription Lifecycle testen | Trial, Purchase, Restore, Renewal, Cancel, Expiry, Billing Retry/Grace, Refund und Accountwechsel. | Testmatrix vollständig dokumentiert. |
| 05.06 | P0 | M | Manage Subscription & Restore | Native Links/SDK-Flows in Settings und Paywall. | Nutzer können Käufe wiederherstellen und Aboverwaltung öffnen. |
| 05.07 | P0 | S | Paywall-Rechtstexte korrekt | Tatsächlich belasteter Gesamtpreis, Trialdauer, Renewal, Restore, Terms, Privacy. | Kein irreführender Monatsäquivalent-Preis als Hauptpreis. |
| 05.08 | P1 | M | Unit Economics Modell | Storefee, VAT, AI Kosten, Hosting, Support und Refunds je zahlendem Nutzer modellieren. | Definierter maximaler AI-Cost/paid-user und Zielmarge. |

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

**Kein Premium-Zugriff ohne gültiges serverseitiges Entitlement; vollständiger Subscription-Lifecycle getestet.**

## Handover-Format

```md
### WP-05 Handover
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
