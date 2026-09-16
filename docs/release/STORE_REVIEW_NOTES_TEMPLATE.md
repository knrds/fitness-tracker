# EVARO – App Store & Play Store Review Notes (Template)

> **Hinweis für Astra / Product Owner:**
> Diese Vorlage dient als Begleittext im Feld "App Review Notes" (App Store Connect) bzw. "App-Zugriff" (Google Play Console). Vor dem Einreichen müssen die markierten Platzhalter (`[USER_ACTION_REQUIRED]`) mit echten Test-Credentials und Kontaktdaten befüllt werden.

---

## Review Notes for App Review Team

### 1. Demo Login & Authentication
EVARO can be tested in two modes:
- **Guest Mode:** Direct access without any registration or account. Tap "Als Gast fortfahren" / "Continue as Guest" on the initial welcome screen.
- **Dedicated Demo Account:**
  - **Username / Email:** `[USER_ACTION_REQUIRED: e.g. review-demo@evaro.app]`
  - **Password:** `[USER_ACTION_REQUIRED: e.g. SecureReviewPass2026!]`
  - *Note:* This demo account is pre-populated with realistic sample training history, custom workouts, and metric data.

---

### 2. Guest Mode
The app does not force users to register or create an account. All core workout tracking, history, timer, and local metrics function 100% offline without network connectivity. Cloud synchronization is entirely optional.

---

### 3. Workout Tracking Flow
To verify the core workout functionality:
1. Navigate to the **Training** / **Workout** tab.
2. Select **"Workout starten"** (Start Empty Workout) or choose a pre-configured template (e.g., *Push*, *Pull*, or *Legs*).
3. Tap **"Übung hinzufügen"** to pick an exercise from the catalog.
4. Enter target **Weight** (kg) and **Reps**.
5. Tap the **Checkmark** button on a set row to complete it:
   - A haptic pulse confirms set completion.
   - The Rest Timer starts automatically.
6. Tap **"Workout beenden"** (Finish Workout) at the top right to persist the session to the local database and view the summary.

---

### 4. AI Coach Explanation & Safety
- EVARO includes an AI Coach designed strictly for training advice, workout planning, and exercise technique guidance.
- **Safety Layer:** The coach backend includes automated safety filters. It explicitly refuses to provide medical diagnoses, severe trauma treatment advice, or extreme/dangerous diet recommendations (such as severe caloric starvation or dry fasting).
- If the reviewer tests health-related safety triggers, the coach deterministically returns evidence-based safety guidance directing the user to qualified healthcare professionals.

---

### 5. In-App Purchases & Subscriptions (IAP)
- In the beta/review configuration, all core and advanced features are fully accessible to ensure complete functional testing.
- **Restore Purchases:** Available under *Profil -> Account & Einstellungen -> Käufe wiederherstellen*.
- In sandbox/StoreKit testing mode, tapping Restore Purchases verifies receipt validation without billing errors.

---

### 6. Account Deletion (Apple Guideline 5.1.1(v))
- Users can initiate account deletion at any time directly inside the app:
  - Path: *Profil -> Account & Einstellungen -> Account löschen*.
- The deletion confirmation dialog prompts the user before deleting all local data and initiating the cloud account termination.

---

### 7. Hardware & Permissions
- **Microphone:** Used solely when the user explicitly taps the microphone button in Coach Chat to transcribe audio into text.
- **Photo Library:** Used solely when the user selects an optional profile avatar or attaches an exercise progress photo.
- **Audio / Speaker:** Used to play an alert tone when the rest timer reaches 00:00.

---

### 8. Reviewer Contact
If you encounter any questions during review or need immediate assistance:
- **Contact Name:** `[USER_ACTION_REQUIRED: Konrad / SkarStudio]`
- **Phone Number:** `[USER_ACTION_REQUIRED: +49 ...]`
- **Email:** `[USER_ACTION_REQUIRED: support@evaro.app]`
