# EVARO – Observability Event Model & Privacy-Safe Telemetry Taxonomy

Dieses Dokument definiert das telemetrische Ereignismodell von EVARO. Es dient als verbindliche Grundlage für zukünftige Observability-Integrationen (z. B. lokales Logging, Diagnostics-Exporte oder ein später von Astra reviewtes Crash-Reporting-System).

---

## 1. Oberste Datenschutz-Leitlinie (DSGVO & Health Privacy)

EVARO speichert und verarbeitet hochsensible Gesundheits-, Trainings- und Körperdaten.

> **STRIKTE REGEL:**  
> Generische Telemetrie und Crash-Reports dürfen **niemals** personenbezogene Gesundheits- oder Authentifizierungsdaten enthalten.

### Ausdrücklich in Telemetrie VERBOTEN:
* ❌ Workout-Inhalte (Übungsnamen, Sätze, Wiederholungen, RPE/RIR, Notizen)
* ❌ Körpermetriken (Körpergewicht, Körperfettanteil, Umfangsmaße)
* ❌ AI Coach Nachrichten, Prompts oder Chat-Verläufe
* ❌ Medizinische Symptome oder Freitext-Notizen
* ❌ E-Mail-Adressen, Klartext-Passwörter oder Auth-Tokens (Access/Refresh Tokens)
* ❌ Exakte geographische Standortdaten

### Ausdrücklich in Telemetrie ERLAUBT:
* ✔ Technische Fehlercodes (z. B. `ERR_HTTP_504`, `PGRST_23505`, `SQLITE_FULL`)
* ✔ Subsystem-Kategorien (z. B. `sync_failure`, `auth_error`)
* ✔ Plattform- und Laufzeit-Metadaten (App-Version, SDK-Version, OS: iOS/Android)
* ✔ Aggregierte Mengenangaben (z. B. Queue-Länge: `queue_length: 3`)
* ✔ Status von Feature-Flags (z. B. `coachEnabled: true`)

---

## 2. Ereignis-Kategorien (Event Taxonomy)

| Event Category | Beschreibung | Erlaubte Payload-Felder (Beispiele) |
|---|---|---|
| `app_start` | Anwendungsstart & Boot-Sequenz | `platform`, `app_version`, `is_dev`, `duration_ms` |
| `app_error` | Nicht abgefangene JS-UI-Fehler (via ErrorBoundary) | `error_id` (z. B. `ERR-A1B2C3`), `component_name` |
| `auth_error` | Authentifizierungsfehler oder Token-Refresh-Fehlschlag | `error_code` (`AUTH_EXPIRED`, `SIGNIN_FAILED`) |
| `sync_failure` | Netzwerkfehler oder Schema-Konflikte im Sync-Worker | `error_code` (`NETWORK_UNREACHABLE`), `retry_count` |
| `coach_failure` | Abbruch oder Timeout der Coach-Schnittstelle | `error_code` (`AI_RATE_LIMIT`, `TIMEOUT_65S`), `safety_intercept` (bool) |
| `export_failure` | Fehler bei DSGVO-Datenexport-Erstellung | `error_code` (`SERIALIZATION_ERROR`) |
| `account_delete_failure` | Fehlschlag der Account-Löschungs-RPC | `error_code` (`RPC_TIMEOUT`, `UNAUTHORIZED`) |
| `subscription_failure` | Verbindungsfehler zu StoreKit / Play Billing / RevenueCat | `error_code` (`STOREKIT_UNAVAILABLE`, `BILLING_CANCELLED`) |

---

## 3. Lokale Implementierungs-Abstraktion (`DiagnosticsService`)

Im Client existiert die providerunabhängige Abstraktion in:

`apps/mobile/src/services/diagnosticsService.ts`

### Eigenschaften:
1. **Kein externer Netzwerk-Upload**: Events verbleiben im lokalen RAM (Ring-Buffer, max. 50 Einträge).
2. **Support-Export (`generateSupportReport`)**: Erzeugt auf Nutzeranforderung einen rein technischen Diagnosebericht für den Kundensupport.
3. **Feature-Flags / Kill-Switches**:
   - `coachEnabled: boolean`
   - `exerciseMediaEnabled: boolean`
   - `cloudSyncEnabled: boolean`
   - `subscriptionsEnabled: boolean`

---

## 4. Astra-Aktivierungs-Gate

Vor Anbindung eines externen Crash-Reporting-Tools (wie Sentry oder Datadog) muss Astra:
1. Prüfen, ob der Provider-SDK Daten vor dem Versand über die Sanitizer-Funktion `sanitizeLogData` leitet.
2. Bestätigen, dass keine automatischen Breadcrumbs mit TextInput-Werten aktiviert sind.
3. Die DSGVO-Auftragsverarbeitungsvereinbarung (AVV) mit dem Telemetrie-Anbieter sicherstellen.
