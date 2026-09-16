# EVARO – Store Submission Checklist (Apple App Store & Google Play)

**Status-Legende:**
- `READY`: Technisch/architektonisch im Repository implementiert & verifiziert
- `MISSING`: Technische Ressource oder Metadatenfeld fehlt noch
- `USER_ACTION_REQUIRED`: Erfordert Entscheidung, Account-Zugang oder juristische Texte des Product Owners
- `ASTRA_REQUIRED`: Erfordert Aktivierung/Review durch Astra (Backend/Production Infra)

> **P0-Regel (Section 35):**
> Keine juristischen Texte, Datenschutzvereinbarungen, medizinischen Claims, Altersfreigaben oder Unternehmensidentitäten dürfen automatisiert erfunden werden. Technische Templates und Platzhalter sind strikt als `USER_ACTION_REQUIRED` gekennzeichnet.

---

## 1. Apple App Store Submission Checklist (App Store Connect)

| Element | Status | Technischer Bezug / Anforderung | Zuständigkeit |
|---|---|---|---|
| **App Name** | `READY` | "EVARO" in `app.json` konfiguriert (max. 30 Zeichen) | Gemini / Astra |
| **Subtitle** | `USER_ACTION_REQUIRED` | Kurzer Untertitel (max. 30 Zeichen, z.B. "Intelligentes Workout Tracking") | Konrad (User) |
| **Description** | `USER_ACTION_REQUIRED` | Vollständiger Store-Beschreibungstext (Features, Workouts, Coach) | Konrad (User) |
| **Keywords** | `USER_ACTION_REQUIRED` | Komma-separierte Keywords (max. 100 Zeichen, z.B. "fitness,workout,gym,hypertrophy,training,rpe") | Konrad (User) |
| **Support URL** | `USER_ACTION_REQUIRED` | Funktionierende Web-URL oder E-Mail-Landingpage (z.B. `https://evaro.app/support`) | Konrad (User) |
| **Privacy URL** | `USER_ACTION_REQUIRED` | Öffentliche Datenschutzerklärung gemäß DSGVO & Apple Guidelines (z.B. `https://evaro.app/privacy`) | Konrad (User) |
| **Marketing URL** | `USER_ACTION_REQUIRED` | Optionale Website-URL (z.B. `https://evaro.app`) | Konrad (User) |
| **Screenshots** | `USER_ACTION_REQUIRED` | 6.7" (iPhone 16 Pro Max) & 6.5" (iPhone 11 Pro Max) & 13" iPad Screenshots | Konrad (User) |
| **App Icon** | `READY` | 1024x1024 PNG ohne Transparenz in `assets/icon.png` vorhanden | Gemini |
| **Age Rating** | `USER_ACTION_REQUIRED` | Fragebogen in App Store Connect (12+ / 17+ wegen ggf. freiem AI-Coach Text) | Konrad / Astra |
| **Privacy Nutrition Labels** | `USER_ACTION_REQUIRED` | Angaben zur Datenerfassung (Lokale Speicherung vs. Supabase Cloud Sync; Diagnostik) | Konrad / Astra |
| **Account Deletion** | `ASTRA_REQUIRED` | UI in `profile.tsx` ist ready; Supabase RPC `delete_user_account()` muss scharf geschaltet sein | Astra |
| **Restore Purchases** | `ASTRA_REQUIRED` | UI-Button in `profile.tsx` vorhanden; RevenueCat Anbindung muss aktiviert werden | Astra |
| **In-App Purchases / IAP** | `ASTRA_REQUIRED` | Subscription-Produkte in App Store Connect & RevenueCat anlegen (Preise, Intervalle) | Astra / Konrad |
| **Review Notes** | `READY` | Technische Review Notes Vorlage in `docs/release/STORE_REVIEW_NOTES_TEMPLATE.md` | Gemini / Astra |
| **Demo Account** | `USER_ACTION_REQUIRED` | Dedizierter Apple Reviewer Login (E-Mail + Passwort) in Supabase Auth | Astra / Konrad |
| **Encryption (Export Compliance)**| `READY` | Standard HTTPS/TLS (Standard Export Declaration: keine proprietäre Verschlüsselung) | Astra |

---

## 2. Google Play Store Submission Checklist (Play Console)

| Element | Status | Technischer Bezug / Anforderung | Zuständigkeit |
|---|---|---|---|
| **App Name** | `READY` | "EVARO" in `app.json` konfiguriert (max. 30 Zeichen) | Gemini / Astra |
| **Short Description** | `USER_ACTION_REQUIRED` | Kurzbeschreibung bis 80 Zeichen | Konrad (User) |
| **Full Description** | `USER_ACTION_REQUIRED` | Ausführliche Beschreibung bis 4000 Zeichen | Konrad (User) |
| **Feature Graphic** | `USER_ACTION_REQUIRED` | 1024 x 500 px PNG/JPEG Banner für Play Store Listing | Konrad (User) |
| **Screenshots** | `USER_ACTION_REQUIRED` | Min. 2 Screenshots pro Gerätetyp (Smartphone, 7" Tablet, 10" Tablet) | Konrad (User) |
| **Privacy Policy** | `USER_ACTION_REQUIRED` | Öffentliche Datenschutzerklärung in Play Console eintragen | Konrad (User) |
| **Data Safety Section** | `USER_ACTION_REQUIRED` | Play Console Formular: Gesammelte Daten (Fitnessdaten, E-Mail bei Cloud-Sync; keine Weitergabe an Dritte) | Konrad / Astra |
| **Content Rating** | `USER_ACTION_REQUIRED` | IARC-Fragebogen in Google Play Console ausfüllen | Konrad (User) |
| **Target Audience** | `USER_ACTION_REQUIRED` | Zielgruppe: 18+ oder 16+ (nicht primär für Kinder) | Konrad (User) |
| **App Access** | `READY` | App bietet vollwertigen Gastmodus ohne Registrierungszwang | Gemini |
| **Ads Declaration** | `READY` | Erklärung: "App enthält keine Werbung" (No Ads) | Gemini / Konrad |
| **Subscription Products** | `ASTRA_REQUIRED` | Play Billing Produkte / Basistarife in Play Console & RevenueCat konfigurieren | Astra / Konrad |
| **Account Deletion Link** | `ASTRA_REQUIRED` | Google fordert Web-Löschformular oder App-Interne Löschung; RPC Aktivierung nötig | Astra |
| **Internal Testing Track** | `USER_ACTION_REQUIRED` | Google Play Console Internal Track für Closed Tester freischalten | Konrad (User) |
| **Production Release** | `USER_ACTION_REQUIRED` | Google Play 20-Tester-Phase (14 Tage) für private Developer Accounts beachten | Konrad (User) |
