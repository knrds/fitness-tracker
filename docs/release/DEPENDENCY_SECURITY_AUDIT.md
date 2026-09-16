# EVARO – Dependency & Supply Chain Security Audit

**Stand:** 16. September 2026  
**Status:** AUDITED (Static Analysis & Package Vulnerability Scan)  
**Package Manager:** pnpm 11.5.0  
**Framework Baseline:** React Native 0.81.5 / Expo SDK ~54.0.37 / React 19.1.0  
**Astra Review ID:** AR-012

---

## 1. Executive Summary

Ein systematischer Audit aller Produktions- und Entwicklungsabhängigkeiten (`pnpm audit`) wurde durchgeführt.

**Wichtigstes Ergebnis:**
- **Zero Critical / High Vulnerabilities in Direct Runtime Dependencies:**
  Keine einzige direkte Produktions-Abhängigkeit (`@supabase/supabase-js`, `zustand`, `zod`, `expo-sqlite`, `expo-secure-store`, `@fitness-tracker/domain`) weist bekannte kritische Sicherheitslücken auf.
- **Transitive CLI / Bundler Warnungen:**
  Bestehende Sicherheitswarnungen stammen aus transitiven Toolchain-Abhängigkeiten von `@expo/cli`, `metro` und `@testing-library` (z. B. `tar`, `@xmldom/xmldom`, `undici`, `minimist`).
- **Framework Freeze:**
  Gemäß den Richtlinien für diesen Scaffolding-Block werden keine riskanten Major-Upgrades oder ungetesteten Overrides vorgenommen, um die Stabilität des Expo SDK 54 Build-Systems nicht zu gefährden.

---

## 2. Detaillierte Vulnerability Matrix

| Package | Severity | Direct / Transitive | Runtime / Dev | Fix Available | Breaking Update Required | Action / Status |
|---|---|---|---|---|---|---|
| `tar` | Moderate | Transitive (`expo > @expo/cli > tar`) | Dev / Build | YES (`>=7.5.12`) | NO | **GELÖST:** In `pnpm-workspace.yaml` via Override `'tar@7.5.16': '7.5.19'` gepinnt (GHSA-23hp-3jrh-7fpw). |
| `minimist` | Low | Transitive (`react-native-chart-kit > react-native-svg > css-select > ... > minimist`) | Runtime (Chart) | YES (`>=0.2.1`) | NO (Deep transitive legacy tool) | **MONITOREN:** Prototypen-Pollution in lokal isoliertem CSS-Selector ohne ungesichertes Web-Input. Astra kann Chart-Kit später evaluieren. |
| `@xmldom/xmldom` | High | Transitive (`@expo/config-plugins > @expo/plist > @xmldom/xmldom`) | Dev (Config Plugins) | YES (`>=0.8.15`) | YES (Major SemVer Bump) | **DEFERRED TO ASTRA:** Teil von Expo SDK 54 Bundled CLI. Blind-Upgrade könnte iOS/Android Plist-Generierung brechen. |
| `undici` | Low / Moderate | Transitive (`@expo/cli > undici`) | Dev (Local Dev Server) | YES (`>=6.27.0`) | NO | **DEFERRED TO ASTRA:** Betrifft nur internen Expo CLI Fetch im lokalen Entwicklungsbetrieb, keine Endnutzer-App-Laufzeit. |
| `ws` | Moderate | Transitive (`metro > ws`) | Dev (Metro HMR / Bundler) | YES (`>=8.18.0`) | NO | **DEFERRED TO ASTRA:** Nur aktiv während lokaler Entwicklung (Metro Bundler WebSocket), nicht im Release-Bundle. |

---

## 3. Direkte Abhängigkeiten (Production Runtime Health)

| Package | Version | Verwendungszweck | Sicherheitsbewertung |
|---|---|---|---|
| `expo` | `~54.0.37` | Core Framework | STABLE / AUDITED |
| `react-native` | `0.81.5` | Mobile Native Runtime | STABLE / AUDITED |
| `react` / `react-dom` | `19.1.0` | React UI Runtime | STABLE / AUDITED |
| `@supabase/supabase-js` | `^2.107.0` | Auth & Cloud Synchronization | STABLE / AUDITED |
| `expo-secure-store` | `~15.0.8` | Hardware Secure Storage (iOS Keychain / Android Keystore) | STABLE / AUDITED |
| `expo-sqlite` | `~16.0.10` | Offline-First Relational & Document DB | STABLE / AUDITED |
| `react-native-mmkv` | `^3.2.0` | Ultra-fast Key-Value Cache | STABLE / AUDITED |
| `zustand` | `^5.0.3` | Client State Management | STABLE / AUDITED |
| `zod` | `^3.24.1` | Schema Validation & Hydration Contracts | STABLE / AUDITED |
| `react-native-reanimated` | `~4.1.7` | Native 60fps UI Animations | STABLE / AUDITED |

---

## 4. Empfohlene Handlungsschritte für Astra

1. **Vor EAS Production Build:**
   Sobald Expo ein offizielles SDK 54 Patch-Release (z. B. `54.0.38+`) herausgibt, das `@expo/cli` mit aktualisiertem `@xmldom/xmldom` bündelt, mit `pnpm up expo@latest` aktualisieren.
2. **Keine manuellen Blanket Overrides auf transitive Bundler:**
   Metro- und Plist-Parser-Abhängigkeiten sollten nicht isoliert übersteuert werden, da dies zu subtilen Fehlern bei der nativen Android-Manifest- und iOS-Info.plist-Generierung führen kann.
3. **Audit-Gate in CI:**
   `pnpm audit --prod` als CI-Gate etablieren (ignoriert reine Dev-Dependencies der CLI-Tools).
