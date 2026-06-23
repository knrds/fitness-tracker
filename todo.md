# Fitness Tracker — Deine Einrichtungs-Checkliste (todo.md)

Diese Liste sammelt alle manuellen Schritte, Anmeldungen, API-Schlüssel, Berechtigungen und SQL-Datenbankmigrationen, die du für den Betrieb, den Cloud-Sync, den KI-Coach, den Running/Nutrition-Tracker, Stripe und spätere App Store-Releases aufsetzen und konfigurieren musst.

---

## 1. Supabase (Backend & Sync) — **Jetzt einrichten (Mission 10 & 11)**
Für Benutzer-Registrierung, Login-Speicherung, Cloud-Synchronisation und Datenpersistenz.

- [ ] **Supabase-Projekt erstellen:**
  - Melde dich auf [supabase.com](https://supabase.com) an.
  - Erstelle ein neues Projekt (z. B. "Volt Performance").
- [ ] **Datenbank-Tabellen anlegen:**
  - Kopiere den Inhalt der Datei [schema.sql](file:///c:/Users/Konrad/fitness-tracker/docs/schema.sql).
  - Gehe im Supabase-Dashboard auf den **SQL Editor**, füge den Inhalt ein und klicke auf **Run**.
- [ ] **API-Zugangsdaten in lokale `.env` eintragen:**
  - Gehe in Supabase zu **Project Settings** -> **API**.
  - Kopiere die `Project URL` und den `anon / public` API-Key.
  - Erstelle im Ordner `apps/mobile/` eine Datei namens `.env` (falls nicht existent) und trage deine Zugangsdaten ein:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=deine-supabase-url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=dein-anon-public-key
    ```
- [ ] **E-Mail-Redirects für Magic Links und Passwort-Reset konfigurieren:**
  - Gehe in Supabase zu **Authentication** -> **URL Configuration**.
  - Trage deine Vercel-Deploy-URL (für die Web-App) und den Deep-Link der App `fitness-tracker://` (für iOS/Android) als gültige Redirect-Ziele ein, damit Passwort-Zurücksetzen und Magic Links korrekt weitergeleitet werden.

---

## 2. AI Fitness Coach (Gemini & Edge Functions) — **Zukunft (Mission 12 & 13)**
Wird benötigt, wenn wir den personalisierten Chat-Coach und die automatisierten Plan-Vorschläge implementieren.

- [ ] **Gemini API-Schlüssel erstellen:**
  - Hole dir einen Gemini API-Key auf [aistudio.google.com](https://aistudio.google.com) (in der Regel kostenloser Tarif verfügbar).
- [ ] **Anthropic API-Schlüssel erstellen (optional):**
  - Falls wir Claude für hochpräzise Zod-konforme JSON-Pläne nutzen möchten: Hole dir einen Claude API-Key auf [console.anthropic.com](https://console.anthropic.com).
- [ ] **Supabase Edge Function für den Chat deployen:**
  - Installiere die Supabase CLI auf deinem Computer: `npm install -g supabase`.
  - Melde dich über die CLI an: `supabase login`.
  - Verknüpfe dein Supabase-Projekt: `supabase link --project-ref dein-projekt-ref`.
  - Deploye die Edge Function: `supabase functions deploy coach-chat`.
- [ ] **API-Keys als Edge-Function-Secrets hinterlegen:**
  - Führe in deiner Konsole aus:
    ```powershell
    supabase secrets set GEMINI_API_KEY=dein-gemini-key
    supabase secrets set ANTHROPIC_API_KEY=dein-claude-key # Falls verwendet
    ```
  - Alternativ kannst du die Secrets im Supabase-Dashboard unter **Settings** -> **Edge Functions** -> **Secrets** eintragen.

---

## 3. Social & Community — **Zukunft (Mission 14–16)**
Wird benötigt, wenn du Social-Profile, Follows und globale Bestenlisten freischalten möchtest.

- [ ] **Additive Social-Datenbanktabellen anlegen:**
  - Führe die additiven SQL-Befehle (aus der zukünftigen Datei `docs/schema_social.sql`) im Supabase **SQL Editor** aus, um Tabellen wie `profiles`, `follows`, `activity_feed` und `challenges` anzulegen.
- [ ] **RLS-Richtlinien für Social-Tabellen verifizieren:**
  - Stelle sicher, dass die Row-Level-Security (RLS)-Richtlinien korrekt angewendet werden, damit Benutzer nur ihre eigenen Profildaten bearbeiten, aber die öffentlichen Feeds anderer Benutzer lesen können.

---

## 4. Stripe (Bezahlsystem für Programme) — **Zukunft (Mission 19)**
Wird benötigt, wenn du den In-App-Marktplatz für kostenpflichtige Trainingspläne im Testmodus simulieren möchtest.

- [ ] **Stripe-Konto erstellen:**
  - Melde dich auf [stripe.com](https://stripe.com) an und aktiviere den **Testmodus**.
- [ ] **Test-API-Keys kopieren:**
  - Gehe im Stripe-Dashboard zu **Developers** -> **API Keys**.
  - Kopiere den `Publishable Key` und den `Secret Key` (beginnend mit `pk_test_` und `sk_test_`).
- [ ] **Supabase Stripe Edge Functions deployen:**
  - Deploye die Checkout- und Webhook-Funktionen:
    ```powershell
    supabase functions deploy stripe-checkout
    supabase functions deploy stripe-webhooks
    ```
- [ ] **Stripe-Keys und Webhook-Secret als Supabase-Secrets hinterlegen:**
  - Setze die Secrets im Terminal:
    ```powershell
    supabase secrets set STRIPE_SECRET_KEY=dein-stripe-secret-key
    supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=dein-stripe-webhook-secret
    ```
- [ ] **Stripe Webhook-Endpunkt einrichten:**
  - Trage die URL deiner Supabase Webhook Edge Function (z. B. `https://<project>.supabase.co/functions/v1/stripe-webhooks`) im Stripe-Dashboard unter **Webhooks** ein, damit Zahlungs-Events an deine DB gesendet werden.

---

## 5. Running Tracker (GPS & Maps) — **Zukunft (Block 12 / Mission 24 & 25)**
Wird benötigt für das GPS-basierte Cardio- und Pace-Tracking mit interaktiver Karte.

- [ ] **Standort-Berechtigungen konfigurieren:**
  - Stelle sicher, dass in `apps/mobile/app.json` die Standortberechtigungen für iOS und Android hinterlegt sind:
    ```json
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Volt Performance benötigt Zugriff auf deinen Standort, um deine Laufrouten aufzuzeichnen."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysPermission": "Volt Performance benötigt dauerhaften Zugriff auf den Standort, um Läufe im Hintergrund aufzuzeichnen."
        }
      ]
    ]
    ```
- [ ] **Google Maps API-Key für Android holen (für native Builds):**
  - Gehe in die Google Cloud Console und erstelle ein Projekt.
  - Aktiviere die **Maps SDK for Android**.
  - Erstelle einen API-Schlüssel und trage ihn in `apps/mobile/app.json` ein:
    ```json
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "dein-google-maps-api-key"
        }
      }
    }
    ```
  - *Hinweis:* Unter iOS wird standardmäßig Apple Maps ohne API-Key verwendet.
- [ ] **Additive GPS-Laufdaten-Tabellen anlegen:**
  - Führe das additive Migrations-SQL für Läufe (z. B. `runs`, `run_coordinates`) im Supabase **SQL Editor** aus.

---

## 6. Nutrition Tracker (Kamera & Food-API) — **Zukunft (Block 13 / Mission 26 & 27)**
Wird benötigt für das Scannen von Barcodes und die Suche nach Lebensmitteln.

- [ ] **Kamera-Berechtigungen konfigurieren:**
  - Stelle sicher, dass in `apps/mobile/app.json` die Kameraberechtigungen für den Barcode-Scanner hinterlegt sind:
    ```json
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Volt Performance benötigt Zugriff auf die Kamera, um Lebensmittel-Barcodes zu scannen."
      }
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Volt Performance benötigt Zugriff auf deine Kamera zum Scannen von Barcodes."
        }
      ]
    ]
    ```
- [ ] **Lebensmittel-Datenbank-API konfigurieren:**
  - Standardmäßig nutzen wir **OpenFoodFacts** (kostenlos und ohne API-Schlüssel).
  - Falls wir auf eine kommerzielle API wechseln (z. B. USDA FoodData Central oder Barcode Lookup), trage die entsprechenden API-Schlüssel in `.env` bzw. als Supabase Secrets ein.
- [ ] **Additive Ernährung-Tabellen anlegen:**
  - Führe das additive Migrations-SQL für Ernährungseinträge und Mahlzeiten im Supabase **SQL Editor** aus.

---

## 7. EAS CLI & App Store Accounts (Produktion & Releases) — **Zukunft (Block 11)**
Wird benötigt, wenn die App als native iOS- und Android-App signiert, per TestFlight verteilt oder im App Store / Google Play Store veröffentlicht werden soll.

- [ ] **EAS CLI global auf deinem Rechner installieren:**
  - Führe aus: `npm install -g eas-cli`
- [ ] **Expo-Account einrichten und einloggen:**
  - Erstelle ein Konto auf [expo.dev](https://expo.dev).
  - Führe in deiner Konsole aus: `eas login` und melde dich an.
- [ ] **EAS-Projekt konfigurieren:**
  - Initialisiere das Projekt im Ordner `apps/mobile/`: `eas project:init`.
- [ ] **Developer-Accounts registrieren (falls App Store-Upload gewünscht):**
  - **Apple App Store:** Registriere dich für das Apple Developer Program ($99/Jahr) auf [developer.apple.com](https://developer.apple.com).
  - **Google Play Store:** Erstelle ein Google-Entwicklerkonto (einmalig $25) auf [play.google.com/apps/publish](https://play.google.com/apps/publish).
- [ ] **App-Icons und Splashscreens prüfen:**
  - Verifiziere, dass alle Bilddateien in `apps/mobile/assets/` die korrekten Maße und Formate haben.
- [ ] **Natives Kompilieren starten:**
  - Für iOS: `eas build --platform ios`
  - Für Android: `eas build --platform android`
  - *Hinweis:* EAS generiert und verwaltet die benötigten Zertifikate und Profile automatisch bei Abfrage deiner Entwickler-Credentials.
