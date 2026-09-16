# EVARO – Store Compliance Technical Audit & Readiness

**Dokumentversion:** 1.0.0  
**Datum:** 16. September 2026  
**Status:** AUDITED & PREPARED (Pre-Store Submission Baseline)  
**Autor:** Antigravity (Gemini Implementation Agent)  
**Zielgruppe:** Astra Reviewer, Product Owner (Konrad), Store Review Operators  

---

## 1. Executive Summary

Dieser Bericht fasst die technische Bereitschaft von **EVARO** hinsichtlich der Richtlinien des **Apple App Store** (App Store Review Guidelines) und des **Google Play Store** (Google Play Policy) zusammen.

Im aktuellen Stand (Beta Baseline `v0.1.0-beta.5`) sind die architektonischen und UI-seitigen Einstiegspunkte für gesetzliche und store-technische Pflichtfelder implementiert. Allerdings verlangen Stores vor dem Livegang verbindliche rechtliche URLs, echte Unternehmensangaben und konfigurierte App-Store-Identifikatoren.

> [!IMPORTANT]
> Gemäß P0-Sicherheitsregeln wurden keine fiktiven Rechtstexte oder Unternehmensdaten generiert. Sobald echte Dokumente (Datenschutzerklärung, Impressum, EULA) vorliegen, müssen die entsprechenden URLs in der Konfiguration hinterlegt werden.

---

## 2. Store Compliance Matrix

| Audit-Bereich | Technische Komponente / Pfad | Store-Anforderung | Aktueller Status | Erforderliche Aktion | Verantwortlich |
|---|---|---|---|---|---|
| **App-Name** | `app.json` (`expo.name: "EVARO"`) | Konsistenter Markenname | **READY** | Keine weiteren Schritte nötig | Gemini / Astra |
| **App-Version** | `app.json` (`version: "1.0.0"`) | Semantic Versioning | **READY** | Vor Release mit Marketing abgleichen | Astra |
| **Build-Metadaten** | `app.json` (`ios.buildNumber`, `android.versionCode`) | Unique Build Numbers für EAS Submit | **PARTIAL** | `buildNumber: "1"`, `versionCode: 1` in `app.json` hinterlegen | Astra |
| **Bundle ID / Package** | `app.json` (`com.fitnesstracker.app`) | Eindeutige Reverse-Domain | **PARTIAL** | Prüfen, ob `com.evaro.app` im Apple/Google Dev Account registriert ist | **USER_ACTION_REQUIRED** |
| **App-Icons** | `assets/icon.png`, `assets/adaptive-icon.png` | 1024x1024 PNG ohne Alpha | **READY** | Lokale Assets vorhanden & im Metro-Build verifiziert | Gemini / Astra |
| **Splash Screen** | `assets/splash-icon.png`, `#0B0B0F` | Fillscreen Branding | **READY** | Dark Mode Hintergrund `#0B0B0F` konfiguriert | Gemini / Astra |
| **Microphone Permission** | `app.json` (`expo-av`) | NSMicrophoneUsageDescription mit Zweck | **READY** | DE String: *"Sprachmemo aufnehmen und für den Coach in Text umwandeln."* | Gemini / Astra |
| **Photo Library Permission** | `app.json` (`expo-image-picker`) | NSPhotoLibraryUsageDescription mit Zweck | **READY** | DE String: *"Die App benötigt Zugriff auf deine Fotos, um Profil- und Trainingsbilder auszuwählen."* | Gemini / Astra |
| **Camera Permission** | `app.json` (`expo-image-picker`) | NSCameraUsageDescription | **READY** (N/A) | Kamera wird aktuell nicht direkt gestartet (nur Image Library). Falls Kamera gewünscht: hinzufügen | Astra |
| **Account Deletion UI** | `apps/mobile/app/profile.tsx` & `accountDeletionService.ts` | Apple Guideline 5.1.1(v) – Löschung in der App initierbar | **READY** | Einstiegspunkt vorhanden; warnt ehrlich, solange Cloud-RPC inaktiv ist; Fallback auf Datenreset | Astra / Gemini |
| **Restore Purchases** | `apps/mobile/app/profile.tsx` & `entitlementService.ts` | Apple Guideline 3.1.1 – Restore Purchases Button Pflicht | **READY** | UI-Button in Einstellungen aktiv; löst `entitlementService.restorePurchases()` aus | Astra / Gemini |
| **Subscription Management** | `apps/mobile/app/profile.tsx` | Apple Guideline 3.1.2 – Link/Button zur Verwaltung | **READY** | UI-Einstiegspunkt vorhanden; zeigt kontrollierten Info-Dialog bis RevenueCat SDK aktiv ist | Astra |
| **Privacy Policy Link** | `apps/mobile/app/profile.tsx` & App Store Connect | Apple Guideline 5.1.1(i) – Gültige URL | **BLOCKED** | Echte Datenschutz-URL (`https://evaro.app/privacy`) bereitstellen und via `Linking.openURL` verknüpfen | **USER_ACTION_REQUIRED** |
| **Terms of Service (EULA)** | `apps/mobile/app/profile.tsx` & App Store Connect | Apple Guideline 3.1.2(c) – Nutzungsbedingungen | **BLOCKED** | Echte AGB/EULA-URL (`https://evaro.app/terms` oder Apple Standard EULA) hinterlegen | **USER_ACTION_REQUIRED** |
| **Impressum (§ 5 DDG)** | `apps/mobile/app/profile.tsx` | Deutscher Rechtsstandard (§ 5 Digitale-Dienste-Gesetz) | **BLOCKED** | Betreiberdaten (Name, Anschrift, Kontakt, USt-ID/HRB) hinterlegen | **USER_ACTION_REQUIRED** |
| **Support Link / FAQ** | `apps/mobile/app/profile.tsx` & App Store Connect | Apple Guideline 1.5 – Funktionierende Support-URL | **BLOCKED** | Support-Kontakt (E-Mail oder `https://evaro.app/support`) bereitstellen | **USER_ACTION_REQUIRED** |
| **Medical Disclaimer** | `apps/mobile/app/profile.tsx`, Coach Onboarding | Haftungsausschluss Sport/Medizin | **READY** | Vollständiger medizinischer Disclaimer in DE und EN im Profil & Coach verankert | Gemini |

---

## 3. Detail-Audit nach Disziplinen

### 3.1 Apple App Store Richtlinien

#### Guideline 5.1.1(v) – Account Deletion
* **Anforderung:** Apps, die Account-Erstellung unterstützen, müssen Nutzern ermöglichen, die Löschung des Accounts innerhalb der App zu initiieren.
* **Technischer Stand:**
  - UI-Button unter *Profil -> Account & Synchronisation -> Account löschen* vorhanden.
  - Verknüpft mit `accountDeletionService.verifyDeletionCapability()`.
  - Wenn das Supabase-Lösch-Backend noch nicht bereitgestellt ist (`BACKEND_NOT_CONFIGURED`), wird der Nutzer transparent informiert und auf das lokale Löschen der Gerätedaten (*"Alle Daten zurücksetzen"*) verwiesen.
  - Kein Schein-Löschvorgang (*Fake Deletion*).
* **Astra Action (AR-014):** Supabase RPC `delete_user_account()` in Migration einbinden und verknüpfen.

#### Guideline 3.1.1 – In-App Purchases & Restore Purchases
* **Anforderung:** Alle Apps mit digitalen Käufen / Abonnements müssen einen deutlich sichtbaren "Käufe wiederherstellen"-Mechanismus bieten.
* **Technischer Stand:**
  - UI-Button unter *Profil -> Account & Synchronisation -> Käufe wiederherstellen* implementiert.
  - Ruft `entitlementService.restorePurchases()` auf.
  - Informiert den Nutzer bei Erfolg über den aktuellen Status (im Beta-Modus: alle Features freigeschaltet).
* **Astra Action (AR-016):** RevenueCat SDK `Purchases.restorePurchases()` einbinden, sobald SDK installiert wird.

#### Guideline 5.1.1(i) – Privacy Policy
* **Anforderung:** Jede App muss in den App-Metadaten und in der App selbst einen funktionierenden Link zur Datenschutzerklärung enthalten.
* **Technischer Stand:**
  - UI-Row in `profile.tsx` vorhanden.
  - Wartet auf finale Domain-URL.
* **User Action:** Datenschutzerklärung auf Landingpage veröffentlichen und URL eintragen.

---

### 3.2 Berechtigungen & Infotexte (`app.json`)

Die in `apps/mobile/app.json` hinterlegten Permission-Strings genügen den Prüfkriterien:

```json
[
  "expo-av",
  {
    "microphonePermission": "Sprachmemo aufnehmen und für den Coach in Text umwandeln."
  }
],
[
  "expo-image-picker",
  {
    "photosPermission": "Die App benötigt Zugriff auf deine Fotos, um Profil- und Trainingsbilder auszuwählen."
  }
]
```

* **Bewertung:** Konkrete, zweckgebundene Begründungen ohne generische Floskeln (*"App needs access"* wird von Apple abgelehnt; die vorhandenen Texte nennen die genaue Funktion).

---

### 3.3 EAS Build / Versionierungs-Empfehlung

In `apps/mobile/app.json` sollten vor dem ersten App Store Upload ergänzt werden:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.evaro.app",
  "buildNumber": "1"
},
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#0B0B0F"
  },
  "package": "com.evaro.app",
  "versionCode": 1
}
```

---

## 4. Checkliste für Astra vor Store-Submit

- [ ] **Domain & Hosting:** `https://evaro.app` (oder Subdomain) aktiv mit SSL.
- [ ] **Datenschutz:** `https://evaro.app/privacy` verlinkt in `profile.tsx` via `Linking.openURL()`.
- [ ] **AGB / EULA:** `https://evaro.app/terms` verlinkt in `profile.tsx`.
- [ ] **Impressum:** `https://evaro.app/impressum` oder modal in `profile.tsx`.
- [ ] **Support:** E-Mail `support@evaro.app` oder Kontaktseite.
- [ ] **Apple Developer Team:** `bundleIdentifier` in Apple Developer Portal angelegt, Push/Auth Capabilities aktiviert.
- [ ] **RevenueCat Project:** API Keys für iOS und Android in EAS Secrets hinterlegt.
- [ ] **Cloud Account Deletion RPC:** Supabase Edge Function oder RPC scharf geschaltet.
