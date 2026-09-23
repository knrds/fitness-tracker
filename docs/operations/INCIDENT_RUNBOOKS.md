# EVARO — Production Incident Runbooks

**Dokumentversion:** 1.0 (Pre-Launch Preparation)  
**Status:** `PREPARED` (Technische Ablaufpläne verifiziert; reale Incident-Owner & Kontakte: `USER_ACTION_REQUIRED`)  
**Geltungsbereich:** Commercial Release Operations (WP-11 Task 11.03 / S8 / S12)

---

## 1. Incident-Klassifikation & Rollen

### 1.1 Schweregrade (Severity Matrix)

| Level | Definition | Beispiele | Reaktionszeit |
|---|---|---|---|
| **SEV-1 (Kritisch / P0)** | Vollständiger Dienstausfall, Datenverlust, offene Sicherheitslücke, unautorisierter Datenabfluss. | RLS-Bypass, Daten-Wipe bei Sync, geleakter Production-Schlüssel, Crash-Loop beim App-Start. | $\le 15$ Minuten |
| **SEV-2 (Hoch / P1)** | Kernfunktion gestört, kein Workaround verfügbar, finanzieller Schaden droht. | KI-Coach antwortet mit 5xx, Webhook-Zustellung fehlgeschlagen, Entitlement-Prüfung blockiert alle Käufer. | $\le 1$ Stunde |
| **SEV-3 (Mittel / P2)** | Teilfunktion gestört, Workaround existiert. | Bildauflösung fehlerhaft, lokaler Export verzögert, fehlerhafte Heatmap-Berechnung. | $\le 4$ Stunden |
| **SEV-4 (Niedrig / P3)** | Kosmetischer Fehler oder isoliertes Randproblem. | Tippfehler in Übersetzung, verzögertes Badge-Icon. | Nächster regulärer Sprint |

### 1.2 Einsatzrollen

> [!NOTE]
> Die konkreten Personennamen, Rufbereitschaftsnummern und E-Mail-Adressen werden vor dem kommerziellen Launch durch den Betreiber hinterlegt (`USER_ACTION_REQUIRED`).

- **Incident Commander (IC):** Gesamtleitung, Koordination der Behebung, Freigabe von Rollbacks. *(Default: Projektinhaber)*
- **Technical Lead (TL):** Technische Fehleranalyse, Code-Hotfix, Deployment. *(Default: Technischer Lead / Astra / Gemini)*
- **Communications & Privacy Lead (CPL):** Nutzerkommunikation, DSGVO-Meldungen gem. Art. 33. *(Default: Datenschutzbeauftragter / Betreiber)*

---

## 2. Runbook 1: AI Safety & Provider Incident

### 2.1 Auslöser & Symptome
- KI-Coach gibt gefährliche/medizinische Ratschläge (Safety-Bypass).
- Prompt-Injection oder Exfiltration des System-Prompts.
- Extremer Token-Verbrauch / Denial-of-Wallet-Angriff.
- Upstream-Provider (Groq/OpenRouter/OpenAI) meldet globale Ausfälle (500/502/503).

### 2.2 Sofortmaßnahmen (Containment $\le 10$ Min.)
1. **Kill Switch aktivieren:**  
   In der Hosting-Umgebung (Vercel / Serverless Environment) das Flag setzen:
   ```bash
   COACH_SERVICE_ENABLED=false
   ```
   *Wirkung:* Der Proxy blockiert sofort alle Provider-Anfragen und liefert die standardisierte Wartungsmeldung aus.
2. **Provider-Spending-Limit prüfen:**  
   Im OpenRouter/Provider-Dashboard das Hard Cap auf den aktuellen Tageswert deckeln, um weitere Kosten zu unterbinden.

### 2.3 Ursachenanalyse & Behebung
1. Betroffene Session-IDs und Eingaben im Proxy-Log inspizieren (strikte Prüfung ohne sensitive Klartext-Leaks).
2. Falls Safety-Regel umgangen wurde: Fehlenden Pattern in `api/coach-safety.cjs` ergänzen.
3. Testsuite ausführen:
   ```bash
   node --test api/coach-chat.test.cjs api/coach-safety.test.cjs
   ```
4. Hotfix deployen und Kill Switch wieder deaktivieren (`COACH_SERVICE_ENABLED=true`).

---

## 3. Runbook 2: Database & Sync Integrity Incident

### 3.1 Auslöser & Symptome
- Datenverlust oder Duplizierung nach Synchronisation.
- RLS-Fehlkonfiguration (Nutzer sieht Daten fremder Accounts).
- Supabase PostgreSQL Connection Exhaustion oder Deadlock.

### 3.2 Sofortmaßnahmen (Containment $\le 15$ Min.)
1. **Sync-Endpunkt pausieren:**
   - In Supabase PostgREST temporär Schreibzugriff auf Tabellen sperren oder API-Schlüssel rotieren.
2. **Lokale Client-Isolation:**
   - Der mobile Client fängt Sync-Fehler fail-closed ab: Die lokale SQLite-Outbox behält ungesendete Workouts unverändert im Cache (`syncFailureScenarios.test.ts`).

### 3.3 Ursachenanalyse & Behebung
1. RLS-Policies und Tenant-Isolation mit dem lokalen Test-Harness verifizieren:
   ```bash
   pnpm test:security
   ```
2. Falls Daten korrumpiert wurden: Point-in-Time-Recovery (PITR) auf den letzten sauberen Snapshot vor dem Vorfall anwenden.
3. Nachträglicher Datenabgleich: Re-Sync der mobilen Outbox-Warteschlangen veranlassen.

---

## 4. Runbook 3: Leaked Secret Incident

### 4.1 Auslöser & Symptome
- Ein Produktionsschlüssel (`SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`) gelangt in ein öffentliches Git-Repository, ein Build-Artefakt oder Client-Logs.

### 4.2 Sofortmaßnahmen (Containment $\le 10$ Min.)
1. **Sofortiger Widerruf (Revocation):**
   - Im jeweiligen Dashboard (Supabase Console, OpenRouter API Keys, Apple Developer Portal) den betroffenen Schlüssel **unverzüglich widerrufen** (`Revoke Key`).
2. **Neuen Schlüssel generieren:**
   - Neuen API-Key mit minimal notwendigen Rechten erzeugen.
3. **Environment aktualisieren:**
   - Neuen Schlüssel in Vercel / CI-Secrets eintragen und Redeploy auslösen.

### 4.3 Forensik & Nachbereitung
1. Audit-Logs des betroffenen Anbieters prüfen: Wurden zwischen Leak und Widerruf unautorisierte Operationen ausgeführt?
2. Lokalen Pre-Commit- und CI-Secret-Scan verifizieren:
   ```bash
   node scripts/security/preview-security-gate.cjs
   ```
3. Commit-Historie bereinigen (falls Secret im Git gelandet ist): Git-Filter-Repo einsetzen und Repository-Inhaber informieren.

---

## 5. Runbook 4: Subscription & Entitlement Incident

### 5.1 Auslöser & Symptome
- Bezahlte Kunden verlieren ihren Pro-Status („Zahlung aktiv, aber Features gesperrt“).
- Webhook-Lieferungen vom Store-Provider schlagen fehl oder werden verzögert.
- Doppelte Belastungen oder gescheiterte Käufe.

### 5.2 Sofortmaßnahmen (Containment)
1. **Grace Period verlängern:**
   - In `entitlementService.ts` sicherstellen, dass bei temporären Netzwerk-/Provider-Ausfällen der Offline-Cache aktiv bleibt (`offline_cached`) und kein zahlender Kunde sofort gesperrt wird.
2. **Store-Status prüfen:**
   - Apple System Status & Google Play Developer Dashboard auf Ausfälle der In-App-Purchase-Infrastruktur prüfen.

### 5.3 Behebung
1. Fehlgeschlagene Webhooks im RevenueCat-/Store-Dashboard manuell zur Wiederholung anstoßen (`Replay Events`).
2. Betroffene Nutzer anleiten, im Einstellungsmenü oder auf der Paywall auf **„Käufe wiederherstellen“** (`Restore Purchases`) zu tippen.

---

## 6. Runbook 5: Bad Release / Staged Rollout Halt

### 6.1 Auslöser & Symptome
- Neue App-Version stürzt bei signifikantem Nutzeranteil sofort beim App-Start ab.
- Kritisches Datenmigrations-Problem in der neuesten Store-Version.

### 6.2 Sofortmaßnahmen (Rollout-Halt $\le 5$ Min.)
1. **Staged Rollout sofort stoppen:**
   - **Apple App Store Connect:** Phased Release pausieren (`Pause Phased Release`).
   - **Google Play Console:** Staged Rollout stoppen (`Halt Rollout`).
2. Dadurch erhalten keine weiteren Bestandsnutzer das fehlerhafte Update.

### 6.3 Behebung & Notfall-Update
1. Wenn über EAS Update / Over-the-Air lösbar:
   ```bash
   eas update:rollback --channel production
   ```
2. Wenn nativer Fehler:
   - Bugfix auf `main` committen.
   - Versionsnummer inkrementieren (z. B. 1.0.1).
   - Bei Apple beschleunigte Überprüfung anfordern (`Request Expedited App Review` mit Begründung: Critical crash bug affecting app startup).

---

## 7. Runbook 6: Privacy & Data Breach Incident (Art. 33 DSGVO)

### 7.1 Auslöser & Symptome
- Unberechtigter Zugriff Dritter auf Nutzerdaten (Trainingsdaten, E-Mail-Adressen, Profile).
- Versehentliche Offenlegung sensitiver Daten in öffentlichen Logs oder Drittanbieter-Tools.

### 7.2 Sofortmaßnahmen (Containment $\le 1$ Stunde)
1. Sicherheitslücke sofort schließen (Zugang sperren, Session-Tokens invalidieren via Supabase Auth Admin).
2. Betroffene Storage-Partition isolieren.
3. Beweise sichern (Server-Logs, Zeitstempel, IP-Adressen) ohne Daten zu überschreiben.

### 7.3 DSGVO-Meldepflichten (Frist: 72 Stunden)
1. **Risikobewertung:**  
   Besteht voraussichtlich ein Risiko für die Rechte und Freiheiten natürlicher Personen? (Da Gesundheits-/Fitnessdaten unter Art. 9 fallen: Im Zweifel Meldepflicht gegeben).
2. **Behördenmeldung (Art. 33 DSGVO):**  
   Meldung innerhalb von maximal **72 Stunden** nach Bekanntwerden an die zuständige Landesdatenschutzbehörde des Betreibers.
3. **Benachrichtigung der Betroffenen (Art. 34 DSGVO):**  
   Falls hohes Risiko: Nutzer unverzüglich per E-Mail informieren mit klaren Handlungsempfehlungen (z. B. Passwort ändern).
