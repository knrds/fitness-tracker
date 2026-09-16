# EVARO Subscription Integration Map

Dieses Dokument dient als architektonische und funktionale Bestandsaufnahme für die bevorstehende Monetarisierung von EVARO (EVARO Pro). Es identifiziert alle kostenintensiven und hochwertigen Features, mappt relevante Screens und definiert die Integrationspunkte für RevenueCat, Supabase und das Backend, ohne voreilige Abhängigkeiten zu installieren.

---

## 1. Existing Premium-Related Code

Im aktuellen Repository-Bestand:
- **Keine native In-App-Purchase-Bibliothek:** Weder `react-native-purchases` (RevenueCat) noch `expo-in-app-purchases` sind installiert.
- **Kein Client-Entitlement-State:** Zustand-Stores enthalten aktuell kein Flag wie `isPremium` oder `hasProEntitlement`.
- **Backend-Schutz (`api/coach-chat.js`):**
  - Prüft aktuell ausschließlich, ob ein gültiger Supabase-Auth-Token vorliegt (`/auth/v1/user`).
  - Rate-Limiting: 10 Anfragen/Minute für eingeloggte Nutzer; 6 Anfragen/Tag für Prototyp-Nutzer (`prototype-`).
  - **Kritische Lücke:** Jeder neu registrierte Nutzer kann unbegrenzt teure LLM- und Whisper-Modelle (OpenRouter) anfragen. Es existiert keine serverseitige Abonnement-Prüfung.
- **Settings-Platzhalter:** Unter `profile.tsx` wurde im Profilmenü der neutrale Menüeintrag "Abonnement verwalten" vorbereitet (`ASTRA_REVIEW_REQUIRED`).

---

## 2. Candidate EVARO Pro Features

Für das kommerzielle Geschäftsmodell von EVARO (Freemium mit EVARO Pro) bieten sich folgende Kernfunktionen zur Differenzierung an:

### Core / Free Tier (Muss frei und offline nutzbar bleiben)
- **Unbegrenztes Workout-Tracking:** Aktive Workouts starten, Sätze/Reps/Gewichte loggen, Übungen austauschen.
- **Lokale Historie & Statistiken:** Bisherige Trainingseinheiten einsehen, PR-Berechnungen (1RM, e1RM).
- **Lokale Übungsbibliothek & Anatomie-Heatmap:** Übungen filtern, Ausführungshinweise, Muskelgruppen-Visualisierung.
- **Lokaler Datenexport:** Vollständiger JSON-Export (DSGVO Art. 20 konform, niemals hinter Paywall).
- **Grundlegende Standard-Templates:** 1–3 gespeicherte Vorlagen.

### EVARO Pro Tier (Kandidaten für Paywall & serverseitiges Gate)
1. **AI Coach (Multi-Modal & Voice):**
   - Sprach-Interaktion via Whisper-Transkription.
   - Bild-Analyse von Haltung/Form via Vision-Modelle.
   - Automatische Generierung und Anpassung kompletter mehrwöchiger Trainingspläne (`Plan Mode`).
   - Deep Research & Hypertrophie-Literatur-Snapshots.
2. **Cloud-Synchronisation & Multi-Device Backup:**
   - Nahtloser Sync über Supabase Postgres / RLS über mehrere Endgeräte hinweg.
3. **Erweiterte Analytics & Volumen-Telemetrie:**
   - Langzeit-Trendanalysen, Erholungs-Monitoring, detaillierte Tonnage- und Belastungsverläufe.
4. **Unbegrenzte Templates & Ordner-Struktur:**
   - Unlimitierte Vorlagen und personalisierte Split-Ordner.
5. **Exklusive UI-Themes & Gamification:**
   - Spezielle Farbwelten (z. B. Royal Titanium, limitierte Rank-Medaillons).

---

## 3. Screens Requiring Entitlement Awareness

| Screen / Feature | Datei | Aktuell geschützt? | Serverseitiger Check erforderlich? | UI-Reaktion bei Free-User |
|---|---|---|---|---|
| **Coach Chat / Composer** | `apps/mobile/app/(tabs)/coach.tsx`, `src/components/CoachComposer.tsx` | Nein (Offen für alle Auth-User) | **JA (Zwingend P0)** | Paywall-Modal nach X Free-Nachrichten oder Sperre mit Teaser |
| **Coach Voice Recording** | `src/hooks/useCoachRecorder.ts` | Nein | **JA** | Sperre des Mikrofon-Buttons mit "Pro Feature"-Badge |
| **Backend AI Endpoint** | `api/coach-chat.js` | Nein (Nur Auth-Check) | **JA (Zwingend P0)** | HTTP 403 `ENTITLEMENT_REQUIRED` |
| **Plan Mode Generation** | `api/coach-chat.js:99` | Nein | **JA** | HTTP 403 `ENTITLEMENT_REQUIRED` |
| **Cloud Sync Worker** | `src/stores/syncWorker.ts`, `src/stores/syncStore.ts` | Nein | Empfohlen (P1) | Lokaler Modus bleibt aktiv; Cloud-Sync erfordert Pro |
| **Template Erstellung (> Limit)** | `app/programs/template-builder.tsx` | Nein (Unbegrenzt) | Nein (Client-Gate ausreichend) | Paywall beim Speichern ab Template 4 |
| **Settings: Abo verwalten** | `app/profile.tsx` | Nein (Placeholder) | Nein (StoreKit/Google Play URL) | Öffnet Store-Aboverwaltung oder In-App Paywall |

---

## 4. Required Integration Points

### 4.1 Mobile Client (React Native / Expo)
- **Bibliothek:** Integration von `react-native-purchases` (RevenueCat SDK).
- **Entitlement Hook:** Bereitstellung von `useSubscription()` bzw. `useEntitlement('evaro_pro')`.
- **Paywall Component:**
  - Hochwertiges BottomSheet / Modal mit Vorteils-Matrix (EVARO Free vs. EVARO Pro).
  - Rechtlich konforme Darstellung von Preis, Laufzeit, Testphase, Kündigungsbedingungen, EULA- und Datenschutz-Links (Apple Guideline 3.1.2).
  - "Käufe wiederherstellen" (Restore Purchases) Button.
- **Offline Resilience:** Gecachte Entitlement-Prüfung, damit Pro-Funktionen bei instabilem Netz im Fitnessstudio nicht flackern.

### 4.2 Backend (`api/coach-chat.js`)
- **Server-Side Gate vor Modellanfrage:**
  - Bevor ein kostenintensiver Call an OpenRouter abgesetzt wird, muss das serverseitig bestätigte Entitlement validiert werden.
  - Niemals allein auf einen Client-Header `isPremium: true` vertrauen.
- **Entitlement-Cache:** Schnelle Abfrage über Supabase-Tabelle `subscriptions` oder direkte RevenueCat REST API (`/v1/subscribers/{app_user_id}`).

### 4.3 Supabase Database
- **Tabelle `subscriptions`:**
  - Spalten: `user_id` (FK `users.id`), `status` (active, past_due, canceled, expired), `product_id`, `expires_at`, `platform` (ios, android), `original_transaction_id`.
  - RLS: Nur der Eigentümer darf seine Subscription lesen; Schreibrechte nur via Service-Role (Webhook).
- **RevenueCat Webhook:**
  - Ein Edge-Function- oder Serverless-Webhook empfängt Events von RevenueCat (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`) und aktualisiert die Tabelle `subscriptions` atomar.

### 4.4 RevenueCat Dashboard (External Setup)
- Erstellung des Projekts in RevenueCat.
- Konfiguration des Entitlement Identifiers (z. B. `pro` oder `evaro_pro`).
- Verknüpfung von Apple App Store Shared Secret und Google Play Service Account.
- Webhook-Weiterleitung an die Produktions-Backend-URL.

### 4.5 Store Configuration (Apple / Google)
- Anlegen der In-App-Purchases (Auto-Renewable Subscriptions) in App Store Connect und Google Play Console.
- Bereitstellung von Standard-Intervallen (z. B. Monat / Jahr).
- Konfiguration der Family-Sharing- und Grace-Period-Optionen.

---

## 5. Detaillierte Spezifikationen & Architektur-Blueprints

Vollständige Vorbereitungen für die Implementierung durch Astra liegen vor in:
- **Feature-Matrix (Free vs Pro, Gates, Offline):** [EVARO_PRO_FEATURE_MATRIX.md](file:///d:/TrainingsAppGPT/docs/release/EVARO_PRO_FEATURE_MATRIX.md) (AR-008)
- **Architektur-Spezifikation (RevenueCat, StoreKit, Webhooks):** [ENTITLEMENT_ARCHITECTURE_SPEC.md](file:///d:/TrainingsAppGPT/docs/release/ENTITLEMENT_ARCHITECTURE_SPEC.md) (AR-008)

---

## 6. ASTRA_REVIEW_REQUIRED

- [ ] **Freemium Limits beschließen:** Finale Festlegung der Free-Kontingente für den AI Coach (3 Test-Prompts vs. 0) und Template-Obergrenze (3 Templates).
- [ ] **RevenueCat SDK Setup:** Installation von `react-native-purchases` und Initialisierung in `app/_layout.tsx`.
- [ ] **Webhook Endpoint:** Bereitstellung von `api/webhooks/revenuecat.js` zur atomaren Pflege von `public.subscriptions` und `public.users.is_pro`.
- [ ] **Serverseitiges Gating:** Aktivierung des `is_pro`-Checks in `api/coach-chat.js` vor Weiterleitung an OpenRouter.
- [ ] **Paywall UI:** Implementierung des nativen Paywall-Modals inklusive "Käufe wiederherstellen"-Button (Guideline 3.1.1).
- [ ] **App Review Test Account:** Vorkonfigurierter Sandbox-Test-Account mit aktivem Pro-Status für die Apple App Store Reviewer.

