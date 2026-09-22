# Third-Party Notices & Asset Software Bill of Materials (SBOM)

**App:** EVARO (Provisional Working Title)  
**Document:** Software & Asset Bill of Materials (WP-04 Task 04.05 / S10)  
**Governance Principle:** Unbestätigte Lizenzen und Rechteketten werden strikt als `UNKNOWN` bzw. `UNVERIFIED` ausgewiesen. Keine spekulativen Annahmen.

---

## 1. Übersicht & Lizenzkategorien

| Kategorie | Asset / Komponente | Quelle | Lizenz | Commercial Rights Status |
|---|---|---|---|---|
| **Datensatz** | `free-exercise-db.json` (873 Übungen) | [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) | The Unlicense (Public Domain) | **VERIFIED** (Daten gemeinfrei) |
| **Bilder (Übungen)** | 873 Bildpaare (`0.jpg` / `1.jpg`) | GitHub Raw CDN (`yuhonas/free-exercise-db`) | Upstream: Unlicense | **UNVERIFIED** (Vorprovenienz / Rechteübertragung unklar) |
| **Vektorgrafik** | Anatomie-Figuren (`AnatomyFigure.tsx`) | [HichamELBSI/react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) | MIT License | **VERIFIED** |
| **Typografie** | Space Grotesk Font-Familie | [Florian Karsten](https://github.com/floriankarsten/space-grotesk) via Google Fonts | SIL Open Font License 1.1 | **VERIFIED** |
| **Typografie** | Manrope Font-Familie | [Mikhail Sharanda](https://github.com/sharanda/manrope) via Google Fonts | SIL Open Font License 1.1 | **VERIFIED** |
| **UI-Icons** | Ionicons via `@expo/vector-icons` | [ionic-team/ionicons](https://github.com/ionic-team/ionicons) | MIT License | **VERIFIED** |
| **UI-Icons** | MaterialIcons / FontAwesome | `@expo/vector-icons` | Apache 2.0 / OFL 1.1 / MIT | **VERIFIED** |
| **Design-Asset** | Level Badges (`level-badges.png`) | Higgsfield AI (Generation Job `4a335c38...`) | KI-generiert | **UNKNOWN** (Kommerzielle Nutzungsbedingungen ungeprüft) |
| **Design-Asset** | Rank Icons (`rank-01.png` – `rank-10.png`) | Lokale PNG-Grafiken | Projekt-intern | **UNKNOWN** (Lizenz-/Rechtenachweis nicht hinterlegt) |
| **Branding** | App Icon, Adaptive Icon, Splash Screen | Projekt-Assets (`studio.skar.evaro`) | Proprietär / Eigentum Entwickler | **VERIFIED** |

---

## 2. Detaillierte Asset-Nachweise

### 2.1 Übungskatalog: `free-exercise-db`
- **Quelle:** https://github.com/yuhonas/free-exercise-db
- **Lizenz:** The Unlicense
- **Lizenztext:**
```text
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.
```
- **Hinweis zu den Bilddateien:** Die Bilddateien (`0.jpg`, `1.jpg`) werden im Upstream-Repository unter der Unlicense bereitgestellt, entstammen historisch jedoch Drittquellen (`wrkout/exercises.json`). Die ursprüngliche Urheberkette der Fotos ist nicht lückenlos dokumentiert.  
- **Kommerzieller Status:** **PARTIAL / UNVERIFIED**. (Task 04.04 bleibt bis zur juristischen Prüfung / Entscheidung über Asset-Austausch `BLOCKED / LEGAL_REVIEW_REQUIRED`).

### 2.2 Anatomie-Vektoren: `react-native-body-highlighter`
- **Quelle:** https://github.com/HichamELBSI/react-native-body-highlighter
- **Dateipfad im Repo:** `apps/mobile/src/components/anatomy/`
- **Lizenz:** MIT License
```text
MIT License

Copyright (c) 2021 Hicham EL BSI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### 2.3 Fonts & Typografie

#### Space Grotesk
- **Urheber:** Florian Karsten (floriankarsten.com)
- **Lizenz:** SIL Open Font License, Version 1.1
- **Kommerzielle Nutzung:** Erlaubt; Weitergabe als Teil von Softwarebündeln gestattet. Kein Verkauf der Schriftart für sich allein.

#### Manrope
- **Urheber:** Mikhail Sharanda (sharanda.me)
- **Lizenz:** SIL Open Font License, Version 1.1
- **Kommerzielle Nutzung:** Erlaubt; Weitergabe als Teil von Softwarebündeln gestattet. Kein Verkauf der Schriftart für sich allein.

### 2.4 Generierte & Lokale Bild-Assets

#### Level Badges (`level-badges.png`)
- **Dateipfad:** `apps/mobile/assets/level-badges.png`
- **Herkunft:** Generiert via Higgsfield AI
- **Status:** **UNKNOWN**. Die AGB und kommerziellen Abtretungsklauseln des KI-Generators wurden nicht juristisch geprüft. Für den Produktions-Release muss entweder die Lizenzfreigabe nachgewiesen oder das Asset durch eine eigene Vektorgrafik ersetzt werden.

#### Rank Icons (`rank-01.png` bis `rank-10.png`)
- **Dateipfad:** `apps/mobile/assets/ranks/rank-*.png`
- **Herkunft:** Vorherige Design-Lieferung
- **Status:** **UNKNOWN**. Kein schriftlicher Rechteabtretungsvertrag im Repository vorhanden.

---

## 3. Open Source Software Libraries (BOM)

Die in EVARO verwendeten npm-/Node-Pakete unterliegen folgenden Lizenzen:

### 3.1 MIT License
Folgende Kernkomponenten werden unter der MIT-Lizenz genutzt:
- `react`, `react-native`, `expo`, `expo-router`
- `zustand` (State Management)
- `zod` (Schema Validation)
- `react-native-mmkv` (High-performance Storage)
- `@react-native-async-storage/async-storage`
- `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`
- `react-native-safe-area-context`, `react-native-svg`
- `lucide-react-native`, `@expo/vector-icons`
- `prettier`, `eslint`, `typescript`, `vitest`

### 3.2 Apache License 2.0
- `@supabase/supabase-js`, `@supabase/postgrest-js`, `@supabase/gotrue-js`
- `@expo/metro-config`

### 3.3 BSD 2-Clause / 3-Clause License
- `source-map`, `nanoid`

### 3.4 Unlicense / Public Domain
- `free-exercise-db` (Datenbankstruktur)

---

## 4. Pflichtenheft vor kommerzieller Veröffentlichung (Release-Gates)

1. **Exercise Photos:** Klärung Task 04.04 (`USER_ACTION_REQUIRED` / `LEGAL_REVIEW_REQUIRED`).
2. **Level & Rank Assets:** Ersatz durch nachweisbar eigene Vektor-Grafiken oder Ablage der schriftlichen Nutzungsrechte (`USER_ACTION_REQUIRED`).
3. **Impressum / Legal Notice:** Verlinkung dieses Dokuments (`THIRD_PARTY_NOTICES.md`) in den App-Einstellungen unter Rechtliches & Lizenzen.
