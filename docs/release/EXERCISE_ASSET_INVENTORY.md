# EVARO Exercise & Media Asset Provenance Inventory

**Dokumentversion:** 2.0 (Post-ExerciseDB Consolidation)  
**Datum:** 16. September 2026  
**Auditor:** Gemini Hardening Agent (im Auftrag von Konrad)  
**Status:** `PARTIAL` (Dataset: VERIFIED; Image Title: UNVERIFIED)

Dieses Dokument dokumentiert die Herkunft, Speicherorte, Lizenzlage und kommerzielle Belastbarkeit aller im Repository vorhandenen Übungsdatenbanken, Medien- und Design-Assets.

---

## 1. Current Exercise Dataset

Dataset: free-exercise-db
Source: https://github.com/yuhonas/free-exercise-db
License: The Unlicense (Public Domain Dedication)
License evidence: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE
Images source: yuhonas/free-exercise-db/exercises (historical wrkout/exercises.json)
Images license: Provided under Unlicense in upstream repository; historical original author chain of title unverified
Commercial use: Data: Permitted without restriction; Images: Potential residual copyright risk for commercial apps
Attribution requirement: None legally required under Unlicense; voluntary attribution recommended
Redistribution: Permitted
Local copy permitted: Yes
Verification status: PARTIAL

---

## 2. Übersichtstabelle aller Asset-Gruppen

| Asset-Gruppe | Anzahl | Quelle | lokal / remote | Lizenz im Repo nachweisbar | Commercial Rights bestätigt | Status |
|---|---:|---|---|---|---|---|
| **Übungs-Katalog (`free-exercise-db.json`)** | 873 Übungen | `yuhonas/free-exercise-db` | lokal | Ja (Unlicense Upstream) | YES (Data public domain) | **VERIFIED** |
| **Übungsfotos (0.jpg / 1.jpg)** | 873 Bildpaare | GitHub Raw CDN (`yuhonas/free-exercise-db`) | remote | Upstream Unlicense, Bild-Vorprovenienz unklar | NO (Chain of title unklar) | **PARTIAL** |
| **Übungs-GIFs (`exerciseGifs.json`)** | 0 (entfernt) | Ehemalige Hotlinks auf `static.exercisedb.dev` | N/A | Datei in Commit `92aae8f` vollständig gelöscht | N/A | **REMOVED** |
| **Übungskatalog V1 (`exercisedb-v1.json`)** | 0 (entfernt) | Ehemaliger 38k-Zeilen-Dump | N/A | Datei in Commit `92aae8f` vollständig gelöscht | N/A | **REMOVED** |
| **Anatomie-Vektorpfade** | 2 SVG-Figuren (Front/Back) | `HichamELBSI/react-native-body-highlighter` | lokal (Code) | Ja (`apps/mobile/src/components/anatomy/LICENSE`: MIT) | YES (MIT konform) | **CLEAR** |
| **Level Badges (`level-badges.png`)** | 1 Sprite (4 Badges) | Generiert via Higgsfield (Job `4a335c38...`) | lokal | Dokumentiert in `README.md`, aber Provider Terms ungeprüft | NO (Terms offen) | **ASTRA_REVIEW_REQUIRED** |
| **Rank Icons (`rank-01.png` - `rank-10.png`)** | 10 PNG-Grafiken | Lokale Bild-Assets | lokal | Keine Lizenzdatei beigelegt | NO | **ASTRA_REVIEW_REQUIRED** |
| **App Icons & Splash** | 4 PNGs (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) | Projekt-Assets | lokal | Proprietär / Projekt-Assets | YES | **CLEAR** |
| **Marken-Emblem (`volt-emblem.png`)** | 1 PNG | Altes Volt-Branding-Emblem | lokal | Veraltetes Branding, kein Lizenzproblem | N/A | **REPLACE_BRANDING** |
| **Icons (UI)** | ~50+ Symbole | `@expo/vector-icons` (`Ionicons` / Ionic) | lokal (npm) | Ja (Ionicons: MIT) | YES | **CLEAR** |
| **Fonts (Typografie)** | 2 Schriftfamilien | `Space Grotesk`, `Manrope` via `@expo-google-fonts` | lokal (npm) | Ja (SIL Open Font License 1.1) | YES | **CLEAR** |
| **Audio / Sound-Effekte** | 0 Audio-Dateien | Keine statischen Audio-Dateien im Repo | N/A | Keine Audiodateien vorhanden | N/A | **SEE_AUDIO_AUDIT** |

---

## 3. Detaillierte Analyse der Übungs-Assets

### 3.1 Freie Übungs-Datenbank (`free-exercise-db.json`)
- **Dateipfad:** `packages/domain/src/data/raw/free-exercise-db.json`
- **Inhalt:** 873 strukturierte Übungen mit Name, Zielmuskeln, Equipment und detaillierten Anleitungen.
- **Upstream:** `https://github.com/yuhonas/free-exercise-db` (The Unlicense).
- **ID-Stabilität:** Deterministische FNV/UUIDv4-Generierung (`raw.id || raw.name`). Identisch zu allen früheren Beta-Releases.
- **Status:** `VERIFIED` für Datensatz und Struktur.

### 3.2 Übungsbilder (`0.jpg` / `1.jpg`)
- **Dateipfad:** Dynamische HTTPS-Auflösung via `packages/domain/src/data/mapExercises.ts`.
- **URL-Muster:** `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${raw.images[0]}`
- **Fallback-Verhalten:** In `ExerciseDetailScreen`, `ExerciseCard` und `ExerciseRow` fängt `onError` fehlende oder geblockte Bilder ab und schaltet auf das neutrale `barbell-outline`-Icon bzw. die MIT-lizenzierte `AnatomyFigure` um.
- **Status:** `PARTIAL`.

### 3.3 Vollständige Entfernung von ExerciseDB
- Die unlizenzierte Datei `exerciseGifs.json` (1.492 Hotlinks auf `static.exercisedb.dev`) wurde in Commit `92aae8f` restlos gelöscht.
- Die ungenutzte Datei `exercisedb-v1.json` (1,4 MB) wurde in Commit `92aae8f` gelöscht.
- `gifUrl` wurde aus Typen, Schemas und Komponenten vollständig entfernt.
- **Aktiver Produktcode enthält 0 Bezüge zu ExerciseDB.**

---

## 4. Handlungsempfehlungen für Astra & Konrad

Detaillierter Nachweis liegt vor in:
- [EXERCISE_DATA_PROVENANCE.md](file:///d:/TrainingsAppGPT/docs/release/EXERCISE_DATA_PROVENANCE.md)
- [EXERCISE_ASSET_REPLACEMENT_PLAN.md](file:///d:/TrainingsAppGPT/docs/release/EXERCISE_ASSET_REPLACEMENT_PLAN.md)

1. **Exercise-Medien für Store-Launch:**
   - Option 1 (Standard): Kostenlose Fotos (`0.jpg`/`1.jpg`) via GitHub Raw CDN nutzen, geschützt durch die implementierten Fallbacks (`barbell-outline` / `AnatomyFigure`).
   - Option 2 (Vollständige Risikofreiheit): Globalen Schalter `modeOverride = 'ANATOMY_FALLBACK'` in `getExerciseMedia.ts` aktivieren, falls vor Store-Einreichung jegliches Restrisiko externer Fotografien eliminiert werden soll.
2. **Rank-Icons & Level-Badges:**
   - Vor Store-Release klären, ob Higgsfield AI-Nutzungsbedingungen kommerzielle App-Nutzung freigeben oder ob stattdessen eigene EVARO-Vektorgrafiken genutzt werden sollen.
